interface WebHook {
  meta: { custom_data: { user_id: string } }
  data: {
    type: 'orders' | string
    attributes: {
      order_number: number
      first_order_item: { product_name: string; product_id: number }
      status: 'active' | 'paid' | string
      user_email: string
    }
  }
}
