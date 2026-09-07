export const ORDER_STEPS = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED']
export const ORDER_STATUSES = [...ORDER_STEPS, 'CANCELLED']
export const ORDER_STATUS_LABELS = {
  PENDING: 'Pending',
  PROCESSING: 'Processing',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
}
