const { jsPDF } = require('jspdf');
const moment = require('moment');
const Task = require('../models/Task');
const Customer = require('../models/Customer');
const User = require('../models/User');

class PDFGenerator {
  constructor() {
    this.doc = null;
  }

  // Initialize PDF document
  initDocument(title = 'Auto Repair CRM Report') {
    this.doc = new jsPDF('p', 'mm', 'a4');
    this.doc.setFont('helvetica');
    this.doc.setFontSize(12);
    
    // Add header
    this.addHeader(title);
    
    return this.doc;
  }

  // Add header to PDF
  addHeader(title) {
    this.doc.setFillColor(41, 128, 185);
    this.doc.rect(0, 0, 210, 30, 'F');
    
    this.doc.setTextColor(255, 255, 255);
    this.doc.setFontSize(20);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Auto Repair CRM', 20, 20);
    
    this.doc.setFontSize(14);
    this.doc.text(title, 20, 35);
    
    // Add date
    this.doc.setFontSize(10);
    this.doc.text(`Generated: ${moment().format('MMMM Do YYYY, h:mm:ss a')}`, 20, 45);
    
    // Reset text color
    this.doc.setTextColor(0, 0, 0);
    this.doc.setFontSize(12);
  }

  // Generate invoice PDF
  async generateInvoicePDF(invoice) {
    // Initialize document
    this.initDocument(`Invoice #${invoice.invoiceNumber}`);

    let yPosition = 60;

    // Company header
    this.doc.setFontSize(16);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('AUTO REPAIR SHOP', 20, yPosition);
    yPosition += 8;

    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text('123 Main Street', 20, yPosition);
    yPosition += 5;
    this.doc.text('City, State 12345', 20, yPosition);
    yPosition += 5;
    this.doc.text('Phone: (555) 123-4567', 20, yPosition);
    yPosition += 5;
    this.doc.text('Email: info@autorepair.com', 20, yPosition);
    yPosition += 15;

    // Invoice details
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(`INVOICE #${invoice.invoiceNumber}`, 120, yPosition);
    yPosition += 8;

    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(`Date: ${moment(invoice.issueDate).format('MM/DD/YYYY')}`, 120, yPosition);
    yPosition += 5;
    this.doc.text(`Due Date: ${moment(invoice.dueDate).format('MM/DD/YYYY')}`, 120, yPosition);
    yPosition += 5;
    this.doc.text(`Status: ${invoice.status.toUpperCase()}`, 120, yPosition);
    yPosition += 15;

    // Customer information
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('BILL TO:', 20, yPosition);
    yPosition += 8;

    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(invoice.customerId.name, 20, yPosition);
    yPosition += 5;
    if (invoice.customerId.address) {
      // Handle address as object or string
      let addressText = '';
      if (invoice.customerId.address && typeof invoice.customerId.address === 'object') {
        const addr = invoice.customerId.address;
        addressText = (addr.street || '') + ', ' + (addr.city || '') + ', ' + (addr.state || '') + ' ' + (addr.zipCode || '');
        addressText = addressText.trim();
        // Remove extra commas
        addressText = addressText.replace(/,\s*,/g, ',').replace(/^,\s*/, '').replace(/\s*,$/, '');
      } else {
        addressText = invoice.customerId.address || '';
      }
      
      if (addressText) {
        this.doc.text(addressText, 20, yPosition);
        yPosition += 5;
      }
    }
    this.doc.text(`Phone: ${invoice.customerId.phone}`, 20, yPosition);
    yPosition += 5;
    this.doc.text(`Email: ${invoice.customerId.email}`, 20, yPosition);
    yPosition += 15;

    // Vehicle information
    if (invoice.vehicleId) {
      this.doc.setFontSize(12);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('VEHICLE:', 20, yPosition);
      yPosition += 8;

      this.doc.setFontSize(10);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(`${invoice.vehicleId.year} ${invoice.vehicleId.make} ${invoice.vehicleId.model}`, 20, yPosition);
      yPosition += 5;
      if (invoice.vehicleId.vin) {
        this.doc.text(`VIN: ${invoice.vehicleId.vin}`, 20, yPosition);
        yPosition += 5;
      }
      if (invoice.vehicleId.licensePlate) {
        this.doc.text(`License: ${invoice.vehicleId.licensePlate}`, 20, yPosition);
        yPosition += 5;
      }
      yPosition += 10;
    }

    // Items table header
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Description', 20, yPosition);
    this.doc.text('Qty', 100, yPosition);
    this.doc.text('Rate', 130, yPosition);
    this.doc.text('Amount', 160, yPosition);
    yPosition += 8;

    // Draw table line
    this.doc.line(20, yPosition, 190, yPosition);
    yPosition += 5;

    // Items
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    
    if (invoice.items && invoice.items.length > 0) {
      invoice.items.forEach(item => {
        // Check if we need a new page
        if (yPosition > 250) {
          this.doc.addPage();
          yPosition = 20;
        }

        this.doc.text(item.description || 'Service', 20, yPosition);
        this.doc.text(item.quantity.toString(), 100, yPosition);
        this.doc.text(`$${item.unitPrice.toFixed(2)}`, 130, yPosition);
        this.doc.text(`$${item.total.toFixed(2)}`, 160, yPosition);
        yPosition += 6;
      });
    } else {
      this.doc.text('Service', 20, yPosition);
      this.doc.text('1', 100, yPosition);
      this.doc.text(`$${invoice.total.toFixed(2)}`, 130, yPosition);
      this.doc.text(`$${invoice.total.toFixed(2)}`, 160, yPosition);
      yPosition += 6;
    }

    yPosition += 5;

    // Draw total line
    this.doc.line(20, yPosition, 190, yPosition);
    yPosition += 8;

    // Totals
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Subtotal:', 130, yPosition);
    this.doc.text(`$${invoice.subtotal.toFixed(2)}`, 160, yPosition);
    yPosition += 6;

    if (invoice.tax > 0) {
      this.doc.text('Tax:', 130, yPosition);
      this.doc.text(`$${invoice.tax.toFixed(2)}`, 160, yPosition);
      yPosition += 6;
    }

    if (invoice.discount > 0) {
      this.doc.text('Discount:', 130, yPosition);
      this.doc.text(`-$${invoice.discount.toFixed(2)}`, 160, yPosition);
      yPosition += 6;
    }

    this.doc.setFontSize(14);
    this.doc.text('TOTAL:', 130, yPosition);
    this.doc.text(`$${invoice.total.toFixed(2)}`, 160, yPosition);
    yPosition += 15;

    // Payment information
    if (invoice.paidAmount > 0) {
      this.doc.setFontSize(10);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(`Amount Paid: $${invoice.paidAmount.toFixed(2)}`, 20, yPosition);
      yPosition += 5;
      this.doc.text(`Balance Due: $${(invoice.total - invoice.paidAmount).toFixed(2)}`, 20, yPosition);
      yPosition += 10;
    }

    // Notes
    if (invoice.notes) {
      this.doc.setFontSize(10);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('Notes:', 20, yPosition);
      yPosition += 5;

      this.doc.setFont('helvetica', 'normal');
      const notesLines = this.doc.splitTextToSize(invoice.notes, 150);
      notesLines.forEach(line => {
        this.doc.text(line, 20, yPosition);
        yPosition += 4;
      });
    }

    // Terms
    if (invoice.terms) {
      yPosition += 10;
      this.doc.setFontSize(10);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('Terms:', 20, yPosition);
      yPosition += 5;

      this.doc.setFont('helvetica', 'normal');
      const termsLines = this.doc.splitTextToSize(invoice.terms, 150);
      termsLines.forEach(line => {
        this.doc.text(line, 20, yPosition);
        yPosition += 4;
      });
    }

    return Buffer.from(this.doc.output('arraybuffer'));
  }

  // Generate daily activity report for a specific Sub Admin
  async generateDailyActivityReport(userId, date = new Date()) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const targetDate = moment(date).startOf('day');
    const endDate = moment(targetDate).endOf('day');

    // Get tasks for the day
    const tasks = await Task.find({
      assignedTo: userId,
      createdAt: {
        $gte: targetDate.toDate(),
        $lte: endDate.toDate()
      }
    }).populate('customer', 'businessName contactPerson.name');

    // Get completed tasks
    const completedTasks = tasks.filter(task => task.status === 'completed');
    const pendingTasks = tasks.filter(task => task.status === 'pending');
    const inProgressTasks = tasks.filter(task => task.status === 'in_progress');

    // Initialize document
    this.initDocument(`Daily Activity Report - ${user.name}`);

    let yPosition = 60;

    // Add user info
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Employee Information', 20, yPosition);
    yPosition += 10;

    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(`Name: ${user.name}`, 20, yPosition);
    yPosition += 5;
    this.doc.text(`Email: ${user.email}`, 20, yPosition);
    yPosition += 5;
    this.doc.text(`Date: ${targetDate.format('MMMM Do YYYY')}`, 20, yPosition);
    yPosition += 15;

    // Add summary
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Daily Summary', 20, yPosition);
    yPosition += 10;

    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(`Total Tasks: ${tasks.length}`, 20, yPosition);
    yPosition += 5;
    this.doc.text(`Completed: ${completedTasks.length}`, 20, yPosition);
    yPosition += 5;
    this.doc.text(`In Progress: ${inProgressTasks.length}`, 20, yPosition);
    yPosition += 5;
    this.doc.text(`Pending: ${pendingTasks.length}`, 20, yPosition);
    yPosition += 5;
    this.doc.text(`Completion Rate: ${tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0}%`, 20, yPosition);
    yPosition += 15;

    // Add task breakdown by type
    const taskTypes = ['marketing', 'sales', 'collections', 'appointments'];
    const typeStats = {};

    taskTypes.forEach(type => {
      const typeTasks = tasks.filter(task => task.type === type);
      const completedTypeTasks = typeTasks.filter(task => task.status === 'completed');
      typeStats[type] = {
        total: typeTasks.length,
        completed: completedTypeTasks.length,
        percentage: typeTasks.length > 0 ? Math.round((completedTypeTasks.length / typeTasks.length) * 100) : 0
      };
    });

    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Progress by Activity Type', 20, yPosition);
    yPosition += 10;

    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');

    Object.entries(typeStats).forEach(([type, stats]) => {
      const typeName = type.charAt(0).toUpperCase() + type.slice(1);
      this.doc.text(`${typeName}: ${stats.completed}/${stats.total} (${stats.percentage}%)`, 20, yPosition);
      yPosition += 5;
    });

    yPosition += 10;

    // Add detailed task list
    if (tasks.length > 0) {
      this.doc.setFontSize(12);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('Detailed Task List', 20, yPosition);
      yPosition += 10;

      this.doc.setFontSize(8);
      this.doc.setFont('helvetica', 'normal');

      tasks.forEach((task, index) => {
        if (yPosition > 250) {
          this.doc.addPage();
          this.addHeader(`Daily Activity Report - ${user.name} (Continued)`);
          yPosition = 60;
        }

        const statusColor = task.status === 'completed' ? [46, 204, 113] : 
                           task.status === 'in_progress' ? [241, 196, 15] : [231, 76, 60];

        this.doc.setFillColor(...statusColor);
        this.doc.rect(15, yPosition - 3, 3, 3, 'F');

        this.doc.text(`${index + 1}. ${task.title}`, 20, yPosition);
        yPosition += 4;
        this.doc.text(`   Type: ${task.type} | Status: ${task.status} | Due: ${moment(task.dueDate).format('MM/DD/YYYY')}`, 20, yPosition);
        yPosition += 4;
        
        if (task.customer) {
          this.doc.text(`   Customer: ${task.customer.businessName}`, 20, yPosition);
          yPosition += 4;
        }

        if (task.description) {
          const description = task.description.length > 50 ? task.description.substring(0, 50) + '...' : task.description;
          this.doc.text(`   Description: ${description}`, 20, yPosition);
          yPosition += 4;
        }

        yPosition += 2;
      });
    }

    return this.doc;
  }

  // Generate customer-specific report
  async generateCustomerReport(customerId) {
    const customer = await Customer.findById(customerId)
      .populate('assignedTo', 'name email')
      .populate('communicationLogs.createdBy', 'name');

    if (!customer) {
      throw new Error('Customer not found');
    }

    // Get tasks related to this customer
    const tasks = await Task.find({ customer: customerId })
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 });

    this.initDocument(`Customer Report - ${customer.businessName}`);

    let yPosition = 60;

    // Add customer information
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Customer Information', 20, yPosition);
    yPosition += 10;

    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(`Business Name: ${customer.businessName}`, 20, yPosition);
    yPosition += 5;
    this.doc.text(`Contact Person: ${customer.contactPerson.name}`, 20, yPosition);
    yPosition += 5;
    this.doc.text(`Phone: ${customer.contactPerson.phone}`, 20, yPosition);
    yPosition += 5;
    this.doc.text(`Email: ${customer.contactPerson.email || 'N/A'}`, 20, yPosition);
    yPosition += 5;
    this.doc.text(`Address: ${customer.address.street}, ${customer.address.city}, ${customer.address.state} ${customer.address.zipCode}`, 20, yPosition);
    yPosition += 5;
    this.doc.text(`Status: ${customer.status}`, 20, yPosition);
    yPosition += 5;
    this.doc.text(`Assigned To: ${customer.assignedTo ? customer.assignedTo.name : 'Unassigned'}`, 20, yPosition);
    yPosition += 15;

    // Add task summary
    const completedTasks = tasks.filter(task => task.status === 'completed');
    const pendingTasks = tasks.filter(task => task.status === 'pending');
    const inProgressTasks = tasks.filter(task => task.status === 'in_progress');

    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Task Summary', 20, yPosition);
    yPosition += 10;

    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(`Total Tasks: ${tasks.length}`, 20, yPosition);
    yPosition += 5;
    this.doc.text(`Completed: ${completedTasks.length}`, 20, yPosition);
    yPosition += 5;
    this.doc.text(`In Progress: ${inProgressTasks.length}`, 20, yPosition);
    yPosition += 5;
    this.doc.text(`Pending: ${pendingTasks.length}`, 20, yPosition);
    yPosition += 15;

    // Add communication history
    if (customer.communicationLogs.length > 0) {
      this.doc.setFontSize(12);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('Recent Communications', 20, yPosition);
      yPosition += 10;

      this.doc.setFontSize(8);
      this.doc.setFont('helvetica', 'normal');

      customer.communicationLogs.slice(0, 10).forEach((log, index) => {
        if (yPosition > 250) {
          this.doc.addPage();
          this.addHeader(`Customer Report - ${customer.businessName} (Continued)`);
          yPosition = 60;
        }

        this.doc.text(`${index + 1}. ${moment(log.createdAt).format('MM/DD/YYYY HH:mm')} - ${log.type} (${log.direction})`, 20, yPosition);
        yPosition += 4;
        this.doc.text(`   Subject: ${log.subject || 'No subject'}`, 20, yPosition);
        yPosition += 4;
        this.doc.text(`   Outcome: ${log.outcome}`, 20, yPosition);
        yPosition += 4;
        this.doc.text(`   By: ${log.createdBy.name}`, 20, yPosition);
        yPosition += 6;
      });
    }

    return this.doc;
  }

  // Generate work completion summary for auto repair shops
  async generateWorkCompletionSummary(customerId, date = new Date()) {
    const customer = await Customer.findById(customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    const targetDate = moment(date).startOf('day');
    const endDate = moment(targetDate).endOf('day');

    // Get completed tasks for this customer on the specified date
    const completedTasks = await Task.find({
      customer: customerId,
      status: 'completed',
      completedDate: {
        $gte: targetDate.toDate(),
        $lte: endDate.toDate()
      }
    }).populate('assignedTo', 'name email');

    this.initDocument(`Work Completion Summary - ${customer.businessName}`);

    let yPosition = 60;

    // Add customer information
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Work Completion Summary', 20, yPosition);
    yPosition += 10;

    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(`Customer: ${customer.businessName}`, 20, yPosition);
    yPosition += 5;
    this.doc.text(`Date: ${targetDate.format('MMMM Do YYYY')}`, 20, yPosition);
    yPosition += 5;
    this.doc.text(`Contact: ${customer.contactPerson.name}`, 20, yPosition);
    yPosition += 15;

    // Add completion summary
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Completed Work', 20, yPosition);
    yPosition += 10;

    if (completedTasks.length === 0) {
      this.doc.setFontSize(10);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text('No tasks were completed on this date.', 20, yPosition);
    } else {
      this.doc.setFontSize(10);
      this.doc.setFont('helvetica', 'normal');

      completedTasks.forEach((task, index) => {
        if (yPosition > 250) {
          this.doc.addPage();
          this.addHeader(`Work Completion Summary - ${customer.businessName} (Continued)`);
          yPosition = 60;
        }

        this.doc.text(`${index + 1}. ${task.title}`, 20, yPosition);
        yPosition += 4;
        this.doc.text(`   Type: ${task.type}`, 20, yPosition);
        yPosition += 4;
        this.doc.text(`   Completed: ${moment(task.completedDate).format('MM/DD/YYYY HH:mm')}`, 20, yPosition);
        yPosition += 4;
        this.doc.text(`   Assigned To: ${task.assignedTo.name}`, 20, yPosition);
        yPosition += 4;

        if (task.result) {
          this.doc.text(`   Result: ${task.result}`, 20, yPosition);
          yPosition += 4;
        }

        if (task.actualDuration) {
          this.doc.text(`   Duration: ${task.actualDuration} minutes`, 20, yPosition);
          yPosition += 4;
        }

        yPosition += 2;
      });
    }

    // Add footer
    yPosition += 10;
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'italic');
    this.doc.text('This report was automatically generated by the Auto Repair CRM system.', 20, yPosition);
    yPosition += 5;
    this.doc.text('For questions or concerns, please contact your assigned representative.', 20, yPosition);

    return this.doc;
  }

  // Generate comprehensive daily report for Super Admin
  async generateSuperAdminDailyReport(date = new Date()) {
    const targetDate = moment(date).startOf('day');
    const endDate = moment(targetDate).endOf('day');

    // Get all Sub Admins
    const subAdmins = await User.find({ role: 'admin', isActive: true });

    // Get all tasks for the day
    const allTasks = await Task.find({
      createdAt: {
        $gte: targetDate.toDate(),
        $lte: endDate.toDate()
      }
    }).populate('assignedTo', 'name email')
      .populate('customer', 'businessName');

    // Get new customers
    const newCustomers = await Customer.find({
      createdAt: {
        $gte: targetDate.toDate(),
        $lte: endDate.toDate()
      }
    }).populate('assignedTo', 'name email');

    this.initDocument('Super Admin Daily Report');

    let yPosition = 60;

    // Add date and summary
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(`Daily Report - ${targetDate.format('MMMM Do YYYY')}`, 20, yPosition);
    yPosition += 15;

    // Overall statistics
    const completedTasks = allTasks.filter(task => task.status === 'completed');
    const totalTasks = allTasks.length;

    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Overall Statistics', 20, yPosition);
    yPosition += 10;

    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(`Total Tasks Created: ${totalTasks}`, 20, yPosition);
    yPosition += 5;
    this.doc.text(`Tasks Completed: ${completedTasks.length}`, 20, yPosition);
    yPosition += 5;
    this.doc.text(`Completion Rate: ${totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0}%`, 20, yPosition);
    yPosition += 5;
    this.doc.text(`New Customers: ${newCustomers.length}`, 20, yPosition);
    yPosition += 15;

    // Sub Admin performance
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Sub Admin Performance', 20, yPosition);
    yPosition += 10;

    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');

    for (const admin of subAdmins) {
      const adminTasks = allTasks.filter(task => task.assignedTo._id.toString() === admin._id.toString());
      const adminCompletedTasks = adminTasks.filter(task => task.status === 'completed');

      if (yPosition > 250) {
        this.doc.addPage();
        this.addHeader('Super Admin Daily Report (Continued)');
        yPosition = 60;
      }

      this.doc.setFont('helvetica', 'bold');
      this.doc.text(`${admin.name}`, 20, yPosition);
      yPosition += 5;

      this.doc.setFont('helvetica', 'normal');
      this.doc.text(`   Tasks: ${adminCompletedTasks.length}/${adminTasks.length} (${adminTasks.length > 0 ? Math.round((adminCompletedTasks.length / adminTasks.length) * 100) : 0}%)`, 20, yPosition);
      yPosition += 5;
    }

    return this.doc;
  }

  // Save PDF to buffer
  saveToBuffer() {
    return Buffer.from(this.doc.output('arraybuffer'));
  }

  // Save PDF to file
  saveToFile(filename) {
    this.doc.save(filename);
  }
}

module.exports = PDFGenerator;
