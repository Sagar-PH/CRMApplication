import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';

@Component({
  selector: 'app-create',
  imports: [FormsModule, CommonModule],
  templateUrl: './create.component.html',
  styleUrl: './create.component.css'
})
export class CreateComponent {
  products_list: any
  customers_list: any

  async ngOnInit() {
    try {
      const [products, customers] = await Promise.all([
        fetch('http://localhost:8080/products/view', {
          method: 'GET',
          credentials: 'include'
        }),
        fetch('http://localhost:8080/customers/view', {
          method: 'GET',
          credentials: 'include'
        })
      ])

      const products_data = await products.json()
      const customers_data = await customers.json()

      this.products_list = products_data.products_request || [];
      this.customers_list = customers_data.customers_request || [];
    } catch (error) {
      console.error('Initialization failed:', error);
    }
  }

  SalesOrderSubmit(SOrderForm: any) {
    fetch('http://localhost:8080/sales_order/create', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(SOrderForm.value)
    }).then(res => res.json())
      .then(data => {
        console.log('Sales order Submit Success')
        SOrderForm.reset()
      })
      .catch(err => console.log('Order Submit Failed'))
  }

  productIdChange(product: any, salesOrderForm: NgForm) {
    if (product !== null) {
      salesOrderForm.form.patchValue({
        quantity: 1,
        productName: product.Name
      });
    }
  }

  productQuantityChange(quantity: any, salesOrderForm: NgForm) {
    if (quantity !== null) {
      let product_value = salesOrderForm.form.value.selectedProduct

      salesOrderForm.form.patchValue({
        productId: product_value.row_id,
        totalAmount: quantity * product_value.Price
      });
    }
  }

  selectedCustomerChange(customer:any, salesOrderForm: NgForm) {
    salesOrderForm.form.patchValue({
      customerId: customer.row_id,
      customerName: customer.CustomerName
    })
  }
}
