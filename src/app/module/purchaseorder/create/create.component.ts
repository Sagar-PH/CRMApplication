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
  vendors_list: any

  async ngOnInit() {
    try {
      const [products, vendors] = await Promise.all([
        fetch('http://localhost:8080/products/view', {
          method: 'GET',
          credentials: 'include'
        }),
        fetch('http://localhost:8080/vendors/view', {
          method: 'GET',
          credentials: 'include'
        })
      ])

      const products_data = await products.json()
      const vendors_data = await vendors.json()

      this.products_list = products_data.products_request || [];
      this.vendors_list = vendors_data.vendors_request || [];
    } catch (error) {
      console.error('Initialization failed:', error);
    }
  }

  PurchaseOrderSubmit(POrderForm: any) {
    fetch('http://localhost:8080/purchase_order/create', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(POrderForm.value)
    }).then(res => res.json())
      .then(data => {
        console.log('Puchase order Submit Success', data)
        POrderForm.reset()
      })
      .catch(err => console.log('Order Submit Failed'))
  }

  productIdChange(product: any, purchaseOrderForm: NgForm) {
    if (product !== null) {
      purchaseOrderForm.form.patchValue({
        quantity: 1,
        productName: product.Name
      });
    }
  }

  productQuantityChange(quantity: any, purchaseOrderForm: NgForm) {
    if (quantity !== null) {
      let product_value = purchaseOrderForm.form.value.selectedProduct

      purchaseOrderForm.form.patchValue({
        productId: product_value.row_id,
        totalAmount: quantity * product_value.Price
      });
    }
  }

  selectedVendorChange(vendor:any, purchaseOrderForm: NgForm) {
    purchaseOrderForm.form.patchValue({
      vendorId: vendor.row_id,
      vendorName: vendor.VendorName
    })
  }
}
