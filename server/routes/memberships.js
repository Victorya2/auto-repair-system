const express = require('express');
const router = express.Router();
const { authenticateToken, requireCustomer } = require('../middleware/auth');
const MembershipPlan = require('../models/MembershipPlan');
const CustomerMembership = require('../models/CustomerMembership');
const Customer = require('../models/Customer');

// Get all membership plans
router.get('/plans', authenticateToken, async (req, res) => {
  try {
    const plans = await MembershipPlan.find({ isActive: true })
      .populate('createdBy', 'name email')
      .sort({ tier: 1, price: 1 });
    
    res.json(plans);
  } catch (error) {
    console.error('Error fetching membership plans:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a single membership plan
router.get('/plans/:id', authenticateToken, async (req, res) => {
  try {
    const plan = await MembershipPlan.findById(req.params.id)
      .populate('createdBy', 'name email');
    
    if (!plan) {
      return res.status(404).json({ message: 'Membership plan not found' });
    }
    
    res.json(plan);
  } catch (error) {
    console.error('Error fetching membership plan:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new membership plan
router.post('/plans', authenticateToken, async (req, res) => {
  try {
    const {
      name,
      description,
      tier,
      price,
      billingCycle,
      features,
      benefits,
      maxVehicles
    } = req.body;

    const plan = new MembershipPlan({
      name,
      description,
      tier,
      price,
      billingCycle,
      features,
      benefits,
      maxVehicles,
      createdBy: req.user.id
    });

    await plan.save();
    
    const populatedPlan = await plan.populate('createdBy', 'name email');
    res.status(201).json(populatedPlan);
  } catch (error) {
    console.error('Error creating membership plan:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a membership plan
router.put('/plans/:id', authenticateToken, async (req, res) => {
  try {
    const plan = await MembershipPlan.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    if (!plan) {
      return res.status(404).json({ message: 'Membership plan not found' });
    }

    res.json(plan);
  } catch (error) {
    console.error('Error updating membership plan:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a membership plan
router.delete('/plans/:id', authenticateToken, async (req, res) => {
  try {
    const plan = await MembershipPlan.findById(req.params.id);
    
    if (!plan) {
      return res.status(404).json({ message: 'Membership plan not found' });
    }

    // Check if any customers are using this plan
    const activeMemberships = await CustomerMembership.find({
      membershipPlan: req.params.id,
      status: 'active'
    });

    if (activeMemberships.length > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete plan with active memberships' 
      });
    }

    plan.isActive = false;
    await plan.save();

    res.json({ message: 'Membership plan deactivated successfully' });
  } catch (error) {
    console.error('Error deleting membership plan:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get customer memberships (for authenticated customer)
router.get('/customer/me', authenticateToken, requireCustomer, async (req, res) => {
  try {
    const customer = await Customer.findOne({ userId: req.user.id });
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const memberships = await CustomerMembership.find({
      customer: customer._id
    })
    .populate('membershipPlan')
    .populate('customer', 'name email phone')
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });

    // Get available plans
    const availablePlans = await MembershipPlan.find({ isActive: true })
      .sort({ price: 1 });

    res.json({
      success: true,
      data: {
        memberships: memberships.map(membership => ({
          _id: membership._id,
          status: membership.status,
          startDate: membership.startDate,
          endDate: membership.endDate,
          nextBillingDate: membership.nextBillingDate,
          billingCycle: membership.billingCycle,
          price: membership.price,
          autoRenew: membership.autoRenew,
          paymentStatus: membership.paymentStatus,
          totalPaid: membership.totalPaid || 0,
          benefitsUsed: {
            inspections: membership.benefitsUsed?.inspections || 0,
            roadsideAssistance: membership.benefitsUsed?.roadsideAssistance || 0,
            priorityBookings: membership.benefitsUsed?.priorityBookings || 0
          },
          membershipPlan: membership.membershipPlan,
          createdAt: membership.createdAt
        })),
        availablePlans: availablePlans.map(plan => ({
          _id: plan._id,
          name: plan.name,
          description: plan.description,
          tier: plan.tier,
          price: plan.price,
          billingCycle: plan.billingCycle,
          features: plan.features,
          benefits: plan.benefits
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching customer memberships:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get customer memberships (for admin use)
router.get('/customer/:customerId', authenticateToken, async (req, res) => {
  try {
    const memberships = await CustomerMembership.find({
      customer: req.params.customerId
    })
    .populate('membershipPlan')
    .populate('customer', 'name email phone')
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });

    res.json(memberships);
  } catch (error) {
    console.error('Error fetching customer memberships:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new customer membership
router.post('/customer/:customerId', authenticateToken, async (req, res) => {
  try {
    const {
      membershipPlan,
      startDate,
      endDate,
      billingCycle,
      price,
      paymentMethod,
      autoRenew,
      notes
    } = req.body;

    // Calculate next billing date
    const nextBillingDate = new Date(startDate);
    switch (billingCycle) {
      case 'monthly':
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
        break;
      case 'quarterly':
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 3);
        break;
      case 'yearly':
        nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
        break;
    }

    const membership = new CustomerMembership({
      customer: req.params.customerId,
      membershipPlan,
      startDate,
      endDate,
      nextBillingDate,
      billingCycle,
      price,
      paymentMethod,
      autoRenew,
      notes,
      createdBy: req.user.id
    });

    await membership.save();
    
    const populatedMembership = await membership
      .populate('membershipPlan')
      .populate('customer', 'name email phone')
      .populate('createdBy', 'name email');

    res.status(201).json(populatedMembership);
  } catch (error) {
    console.error('Error creating customer membership:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Update customer membership
router.put('/customer/:customerId/:membershipId', authenticateToken, async (req, res) => {
  try {
    const membership = await CustomerMembership.findOneAndUpdate(
      {
        _id: req.params.membershipId,
        customer: req.params.customerId
      },
      req.body,
      { new: true, runValidators: true }
    )
    .populate('membershipPlan')
    .populate('customer', 'name email phone')
    .populate('createdBy', 'name email');

    if (!membership) {
      return res.status(404).json({ message: 'Membership not found' });
    }

    res.json(membership);
  } catch (error) {
    console.error('Error updating customer membership:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Cancel customer membership
router.patch('/customer/:customerId/:membershipId/cancel', authenticateToken, async (req, res) => {
  try {
    const { cancellationReason } = req.body;

    const membership = await CustomerMembership.findOneAndUpdate(
      {
        _id: req.params.membershipId,
        customer: req.params.customerId
      },
      {
        status: 'cancelled',
        cancellationReason,
        cancellationDate: new Date(),
        cancelledBy: req.user.id
      },
      { new: true }
    )
    .populate('membershipPlan')
    .populate('customer', 'name email phone')
    .populate('createdBy', 'name email');

    if (!membership) {
      return res.status(404).json({ message: 'Membership not found' });
    }

    res.json(membership);
  } catch (error) {
    console.error('Error cancelling membership:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get membership statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await CustomerMembership.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$totalPaid' }
        }
      }
    ]);

    const totalMemberships = await CustomerMembership.countDocuments();
    const activeMemberships = await CustomerMembership.countDocuments({ status: 'active' });
    const expiringSoon = await CustomerMembership.countDocuments({
      status: 'active',
      endDate: {
        $gte: new Date(),
        $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      }
    });

    res.json({
      totalMemberships,
      activeMemberships,
      expiringSoon,
      statusBreakdown: stats
    });
  } catch (error) {
    console.error('Error fetching membership stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
