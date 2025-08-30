import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { 
  customerService, 
  Customer, 
  CreateCustomerData, 
  UpdateCustomerData, 
  CustomerFilters,
  CustomerStats 
} from '../../services/customers';

// Async thunks
export const fetchCustomers = createAsyncThunk(
  'customers/fetchCustomers',
  async (params: { page?: number; limit?: number; search?: string; status?: string } = {}, { rejectWithValue }) => {
    try {
      const response = await customerService.getCustomers(params)
      return response.data
    } catch (error: any) {
      console.error('fetchCustomers: Error:', error)
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch customers')
    }
  }
)

// Fetch single customer by ID
export const fetchCustomer = createAsyncThunk(
  'customers/fetchCustomer',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await customerService.getCustomer(id)
      console.log('fetchCustomer response:', response)
      
      // Handle different response structures
      if (response.data && typeof response.data === 'object' && 'customer' in response.data) {
        // If data is wrapped in a customer property
        return response.data.customer
      } else if (response.data) {
        // If data is the customer object directly
        return response.data
      } else {
        // Fallback to the entire response
        return response
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch customer')
    }
  }
)

// Create new customer
export const createCustomer = createAsyncThunk(
  'customers/createCustomer',
  async (customerData: CreateCustomerData, { rejectWithValue }) => {
    try {
      const response = await customerService.createCustomer(customerData)
      // Handle response structure properly
      if (response.data && typeof response.data === 'object' && 'customer' in response.data) {
        return response.data.customer
      }
      return response.data || response
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to create customer'
      return rejectWithValue(message)
    }
  }
)

// Update existing customer
export const updateCustomer = createAsyncThunk(
  'customers/updateCustomer',
  async ({ id, customerData }: { id: string; customerData: UpdateCustomerData }, { rejectWithValue }) => {
    try {
      const response = await customerService.updateCustomer(id, customerData)
      // Handle response structure properly
      if (response.data && typeof response.data === 'object' && 'customer' in response.data) {
        return response.data.customer
      }
      return response.data || response
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update customer'
      return rejectWithValue(message)
    }
  }
)

// Delete customer
export const deleteCustomer = createAsyncThunk(
  'customers/deleteCustomer',
  async (id: string, { rejectWithValue }) => {
    try {
      await customerService.deleteCustomer(id)
      return id
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to delete customer'
      return rejectWithValue(message)
    }
  }
)

// Delete vehicle
export const deleteVehicle = createAsyncThunk(
  'customers/deleteVehicle',
  async ({ customerId, vehicleId }: { customerId: string; vehicleId: string }, { rejectWithValue }) => {
    try {
      await customerService.deleteVehicle(customerId, vehicleId)
      return { customerId, vehicleId }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to delete vehicle'
      return rejectWithValue(message)
    }
  }
)

// Fetch customer statistics
export const fetchCustomerStats = createAsyncThunk(
  'customers/fetchStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await customerService.getCustomerStats()
      return response.data
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch customer stats')
    }
  }
)

// Search customers
export const searchCustomers = createAsyncThunk(
  'customers/searchCustomers',
  async (query: string, { rejectWithValue }) => {
    try {
      const response = await customerService.searchCustomers(query)
      return response.data?.customers || response.data || []
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to search customers')
    }
  }
)

// Customer slice
interface CustomerState {
  list: Customer[];
  selectedCustomer: Customer | null;
  stats: CustomerStats | null;
  loading: boolean;
  error: string | null;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCustomers: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } | null;
  searchResults: Customer[];
  searchLoading: boolean;
}

const initialState: CustomerState = {
  list: [],
  selectedCustomer: null,
  stats: null,
  loading: false,
  error: null,
  pagination: null,
  searchResults: [],
  searchLoading: false,
};

const customerSlice = createSlice({
  name: 'customers',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearSelectedCustomer: (state) => {
      state.selectedCustomer = null;
    },
    clearSearchResults: (state) => {
      state.searchResults = [];
    },
    setSelectedCustomer: (state, action: PayloadAction<Customer>) => {
      state.selectedCustomer = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Fetch customers
    builder
      .addCase(fetchCustomers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCustomers.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.customers;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchCustomers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch single customer
    builder
      .addCase(fetchCustomer.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCustomer.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedCustomer = action.payload as Customer;
      })
      .addCase(fetchCustomer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Create customer
    builder
      .addCase(createCustomer.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCustomer.fulfilled, (state, action) => {
        state.loading = false;
        state.list.unshift(action.payload);
        if (state.pagination) {
          state.pagination.totalCustomers += 1;
        }
      })
      .addCase(createCustomer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Update customer
    builder
      .addCase(updateCustomer.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCustomer.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.list.findIndex(customer => customer._id === action.payload._id);
        if (index !== -1) {
          state.list[index] = action.payload;
        }
        if (state.selectedCustomer?._id === action.payload._id) {
          state.selectedCustomer = action.payload;
        }
      })
      .addCase(updateCustomer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Delete customer
    builder
      .addCase(deleteCustomer.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteCustomer.fulfilled, (state, action) => {
        state.loading = false;
        state.list = state.list.filter(customer => customer._id !== action.payload);
        if (state.pagination) {
          state.pagination.totalCustomers -= 1;
        }
        if (state.selectedCustomer?._id === action.payload) {
          state.selectedCustomer = null;
        }
      })
      .addCase(deleteCustomer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Delete vehicle
    builder
      .addCase(deleteVehicle.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteVehicle.fulfilled, (state, action) => {
        state.loading = false;
        // Remove the vehicle from the selected customer's vehicles array
        if (state.selectedCustomer && state.selectedCustomer.vehicles) {
          state.selectedCustomer.vehicles = state.selectedCustomer.vehicles.filter(
            vehicle => vehicle._id !== action.payload.vehicleId && vehicle.id !== action.payload.vehicleId
          );
        }
      })
      .addCase(deleteVehicle.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch stats
    builder
      .addCase(fetchCustomerStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCustomerStats.fulfilled, (state, action) => {
        state.loading = false;
        state.stats = action.payload;
      })
      .addCase(fetchCustomerStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Search customers
    builder
      .addCase(searchCustomers.pending, (state) => {
        state.searchLoading = true;
        state.error = null;
      })
      .addCase(searchCustomers.fulfilled, (state, action) => {
        state.searchLoading = false;
        state.searchResults = action.payload;
      })
      .addCase(searchCustomers.rejected, (state, action) => {
        state.searchLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearSelectedCustomer, clearSearchResults, setSelectedCustomer } = customerSlice.actions;
export default customerSlice.reducer;
