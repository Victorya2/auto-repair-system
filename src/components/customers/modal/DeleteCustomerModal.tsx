import React, { useState } from 'react'
import { Customer } from '../../../services/customers'
import {
  HiExclamation,
  HiTrash
} from 'react-icons/hi'
import ModalWrapper from '../../../utils/ModalWrapper'

interface DeleteCustomerModalProps {
  customer: Customer
  isOpen: boolean
  onClose: () => void
  onDelete: (id: string) => Promise<void>
}

const DeleteCustomerModal: React.FC<DeleteCustomerModalProps> = ({
  customer,
  isOpen,
  onClose,
  onDelete
}) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    try {
      setLoading(true)
      setError(null)
      await onDelete(customer.id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete customer')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Customer"
      submitText="Delete Customer"
      onSubmit={handleDelete}
      isLoading={loading}
      submitButtonVariant="error"
    >
      <div className="p-4 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-100 rounded-full">
            <HiExclamation className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h4 className="font-medium text-secondary-900">Are you sure?</h4>
            <p className="text-sm text-secondary-600">
              This action cannot be undone. This will permanently delete the customer and all associated data.
            </p>
          </div>
        </div>

        <div className="bg-secondary-50 p-4 rounded-lg">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-secondary-600">Customer Name:</span>
              <span className="text-sm font-medium text-secondary-900">
                {customer.firstName} {customer.lastName}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-secondary-600">Email:</span>
              <span className="text-sm font-medium text-secondary-900">{customer.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-secondary-600">Phone:</span>
              <span className="text-sm font-medium text-secondary-900">{customer.phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-secondary-600">Address:</span>
              <span className="text-sm font-medium text-secondary-900">
                {customer.address?.street}, {customer.address?.city}, {customer.address?.state} {customer.address?.zipCode}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-secondary-600">Vehicles:</span>
              <span className="text-sm font-medium text-secondary-900">
                {customer.vehicles?.length || 0} vehicle(s)
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-secondary-600">Status:</span>
              <span className="text-sm font-medium text-secondary-900 capitalize">
                {customer.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded text-sm">
          <p className="font-medium mb-1">⚠️ Warning:</p>
          <p>Deleting this customer will also remove:</p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>All vehicle records</li>
            <li>Service history</li>
            <li>Appointment records</li>
            <li>Payment history</li>
            <li>Communication logs</li>
          </ul>
        </div>
      </div>
    </ModalWrapper>
  )
}

export default DeleteCustomerModal
