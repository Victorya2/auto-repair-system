// Vehicle Information
export interface Vehicle {
    id: string
    _id?: string
    make: string
    model: string
    year: number
    vin: string
    licensePlate: string
    mileage: number
    color?: string
    customerId?: string
    customer?: string
    status?: 'active' | 'inactive' | 'maintenance'
    engineType?: string
    transmission?: 'automatic' | 'manual' | 'cvt' | 'other'
    fuelType?: 'gasoline' | 'diesel' | 'hybrid' | 'electric' | 'other'
    lastServiceDate?: string
    nextServiceDate?: string
    lastServiceMileage?: number
    nextServiceMileage?: number
    notes?: string
    createdAt?: string
    updatedAt?: string
}

// Service Record
export interface ServiceRecord {
    id: string
    _id?: string
    serviceType: string
    description?: string
    date: string
    mileage?: number
    parts?: ServicePart[]
    laborHours?: number
    laborRate?: number
    totalCost: number
    technician?: string
    notes?: string
    nextServiceDue?: string
    nextServiceMileage?: number
    vehicleId?: string
    customerId?: string
    createdAt?: string
    updatedAt?: string
}

// Service Part
export interface ServicePart {
    id?: string
    _id?: string
    name: string
    partNumber?: string
    quantity: number
    unitPrice: number
    totalPrice: number
}

// Communication Log
export interface CommunicationLog {
    id: string
    _id?: string
    customerId: string | { id: string; _id: string; name: string; fullAddress?: string; [key: string]: any }
    date: string
    time?: string
    type: 'phone' | 'email' | 'in-person' | 'sms'
    direction: 'inbound' | 'outbound'
    subject?: string
    content: string
    summary?: string
    notes?: string
    followUpDate?: string
    outcome?: 'resolved' | 'follow-up-needed' | 'appointment-scheduled' | 'no-answer' | 'callback-requested'
    priority?: 'low' | 'medium' | 'high'
    relatedService?: string
    employeeId: string
    employeeName: string
    createdAt?: string
    updatedAt?: string
}

// Customer Profile - Unified interface matching backend structure
export interface Customer {
    // Core identification
    id: string
    _id?: string
    
    // Basic information
    name: string
    email: string
    phone: string
    businessName?: string
    
    // Address information
    address?: {
        street?: string
        city?: string
        state?: string
        zipCode?: string
    }
    
    // Customer data
    dateCreated?: string
    createdAt?: string
    updatedAt?: string
    lastVisit?: string
    lastContact?: string
    nextFollowUp?: string
    
    // Relationships
    vehicles?: Vehicle[]
    serviceHistory?: ServiceRecord[]
    communicationLog?: CommunicationLog[]
    
    // Financial information
    payments?: Array<{
        _id?: string
        id?: string
        amount: number
        date: string
        method: 'cash' | 'card' | 'check' | 'bank_transfer' | 'online' | 'other'
        reference?: string
        notes?: string
        status: 'pending' | 'completed' | 'failed' | 'refunded'
        createdAt?: string
    }>
    
    arrangements?: Array<{
        _id?: string
        id?: string
        date: string
        amount: number
        notes?: string
        status: 'pending' | 'active' | 'completed' | 'cancelled'
        type: 'installment' | 'payment_plan' | 'deferred' | 'other'
        dueDate: string
        createdAt?: string
    }>
    
    towingRecords?: Array<{
        _id?: string
        id?: string
        date: string
        location: string
        destination?: string
        status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
        notes?: string
        cost: number
        vehicle?: string
        createdAt?: string
    }>
    
    callLogs?: Array<{
        _id?: string
        id?: string
        date: string
        type: 'inbound' | 'outbound' | 'missed' | 'voicemail'
        duration: number
        notes?: string
        summary?: string
        followUpDate?: string
        followUpRequired: boolean
        phoneNumber?: string
        createdAt?: string
    }>
    
    // Notes and preferences
    notes?: string
    preferences?: {
        notifications?: {
            email?: boolean
            sms?: boolean
            push?: boolean
        }
        reminders?: {
            appointments?: boolean
            maintenance?: boolean
            payments?: boolean
        }
        privacy?: {
            shareData?: boolean
            marketing?: boolean
        }
        preferredContactMethod?: 'phone' | 'email' | 'sms'
        reminderPreferences?: {
            appointmentReminders?: boolean
            serviceReminders?: boolean
            followUpReminders?: boolean
        }
    }
    
    // Status and metadata
    status?: 'active' | 'inactive' | 'prospect'
    
    // Legacy fields for backward compatibility
    accountNumber?: string
    originalDebt?: number
    currentDebt?: number
    
    // User account reference
    userId?: string
    assignedTo?: string
    createdBy?: string
}

// Appointment types
export interface Appointment {
    id: string
    customerId: string
    customerName: string
    vehicleId: string
    vehicleInfo: string
    vehicle?: {
        id: string
        year: number
        make: string
        model: string
        vin: string
        licensePlate: string
        mileage: number
    }
    scheduledDate: string
    scheduledTime: string
    estimatedDuration: number // in minutes
    serviceType: string | {
        _id: string
        name: string
        category: string
        estimatedDuration: number
    }
    description: string
    status: 'scheduled' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | 'no-show'
    technicianId?: string
    technicianName?: string
    technician?: {
        _id: string
        name: string
        email?: string
        specializations?: string[]
    }
    priority: 'low' | 'medium' | 'high' | 'urgent'
    createdDate: string
    notes?: string
}

// Service Catalog
export interface ServiceCatalogItem {
    id: string
    name: string
    description: string
    category: string
    estimatedDuration: number // in minutes
    laborRate: number
    parts: ServicePart[]
    isActive: boolean
}

// Technician
export interface Technician {
    id: string
    name: string
    email: string
    phone: string
    specializations: string[]
    hourlyRate: number
    isActive: boolean
}

// Work Order
export interface WorkOrder {
    id: string
    appointmentId?: string
    customerId: string
    vehicleId: string
    date: string
    status: 'created' | 'in-progress' | 'waiting-parts' | 'completed' | 'invoiced'
    services: ServiceCatalogItem[]
    partsUsed: ServicePart[]
    laborHours: number
    technicianId: string
    technicianName: string
    subtotal: number
    tax: number
    total: number
    notes?: string
    customerSignature?: string
    completedDate?: string
}

// Invoice Item
export interface InvoiceItem {
    type: 'service' | 'part' | 'labor' | 'other'
    name: string
    description?: string
    quantity: number
    unitPrice: number
    totalPrice: number
    reference?: string
    referenceModel?: 'ServiceCatalog' | 'InventoryItem' | 'WorkOrder'
}

// Invoice
export interface Invoice {
    _id: string
    invoiceNumber: string
    customer: {
        _id: string
        name: string
        email?: string
        phone?: string
    }
    workOrder?: string
    appointment?: string
    vehicle: {
        make: string
        model: string
        year: number
        vin?: string
        licensePlate?: string
    }
    items: InvoiceItem[]
    subtotal: number
    taxRate: number
    taxAmount: number
    discountType: 'percentage' | 'fixed' | 'none'
    discountValue: number
    discountAmount: number
    total: number
    status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'refunded'
    issueDate: string
    dueDate: string
    paidDate?: string
    paymentMethod?: 'cash' | 'check' | 'credit_card' | 'debit_card' | 'bank_transfer' | 'online' | 'other'
    paymentReference?: string
    paidAmount: number
    balance: number
    notes?: string
    terms?: string
    createdBy: string
    createdAt: string
    updatedAt: string
}

// Inventory Item
export interface InventoryItem {
    _id?: string
    id: string
    partNumber: string
    name: string
    description: string
    category: string
    subcategory?: string
    brand?: string
    model?: string
    year?: string
    supplier: string | { name: string; contact?: string; email?: string; phone?: string; website?: string }
    costPrice: number
    sellingPrice: number
    currentStock: number
    minimumStock: number
    maximumStock: number
    reorderPoint?: number
    location: string | { warehouse?: string; shelf?: string; bin?: string }
    isActive: boolean
    lastUpdated: string
}

// Create Inventory Item Data
export interface CreateInventoryItemData {
    name: string
    description: string
    partNumber: string
    category: string
    subcategory?: string
    brand?: string
    model?: string
    year?: string
    location: string | { warehouse?: string; shelf?: string; bin?: string }
    currentStock: number
    minimumStock: number
    maximumStock: number
    reorderPoint: number
    costPrice: number
    sellingPrice: number
    supplierId: string
    isActive?: boolean
}

// Update Inventory Item Data
export interface UpdateInventoryItemData {
    name?: string
    description?: string
    partNumber?: string
    category?: string
    subcategory?: string
    brand?: string
    model?: string
    year?: string
    location?: string | { warehouse?: string; shelf?: string; bin?: string }
    currentStock?: number
    minimumStock?: number
    maximumStock?: number
    reorderPoint?: number
    costPrice?: number
    sellingPrice?: number
    supplierId?: string
    isActive?: boolean
}

// Inventory Transaction
export interface InventoryTransaction {
    _id?: string
    id: string
    itemId: string
    type: 'purchase' | 'usage' | 'adjustment' | 'return' | 'damage' | 'transfer'
    quantity: number
    unitCost?: number
    totalCost?: number
    reference: string
    notes?: string
    employeeName: string
    date: string
}

// Supplier
export interface Supplier {
    _id?: string
    id: string
    name: string
    contactPerson: string | { name: string; email: string; phone?: string; position?: string }
    email: string
    phone: string
    paymentTerms: string
    rating: number
    notes?: string
    isActive: boolean
}

// Purchase Order
export interface PurchaseOrder {
    _id?: string
    id: string
    supplierName: string
    orderDate: string
    expectedDate?: string
    items: Array<{
        itemId: string
        name: string
        quantity: number
        unitPrice: number
        totalPrice: number
    }>
    total: number
    status: 'draft' | 'sent' | 'confirmed' | 'received' | 'cancelled'
}

// Reminder/Notification
export interface Reminder {
    id: string
    type: 'appointment' | 'service-due' | 'follow-up' | 'payment-due'
    customerId: string
    customerName: string
    vehicleId?: string
    appointmentId?: string
    scheduledDate: string
    message: string
    status: 'pending' | 'sent' | 'delivered' | 'failed'
    method: 'email' | 'sms' | 'phone'
    createdDate: string
    sentDate?: string
}
