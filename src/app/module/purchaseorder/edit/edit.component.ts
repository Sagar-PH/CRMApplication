import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-edit',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './edit.component.html',
  styleUrls: ['./edit.component.css']
})

export class EditComponent implements OnInit {
  id!: number;
  requested_data: any = null;
  products_list: any[] = [];
  vendors_list: any[] = [];
  selectedProduct: any = null;
  selectedVendor: any = null;

  constructor(private route: ActivatedRoute) { }

  async ngOnInit() {
    this.id = Number(this.route.snapshot.paramMap.get('id'));

    try {
      const [productsRes, orderRes, vendorsRes] = await Promise.all([
        fetch('http://localhost:8080/products/view', {
          method: 'GET',
          credentials: 'include'
        }),
        fetch(`http://localhost:8080/purchase_order/edit/${this.id}`, {
          method: 'GET',
          credentials: 'include'
        }),
        fetch('http://localhost:8080/vendors/view', {
          method: 'GET',
          credentials: 'include'
        }),
      ]);

      const productsData = await productsRes.json();
      const orderData = await orderRes.json();
      const vendorsData = await vendorsRes.json();

      this.products_list = productsData.products_request || [];
      this.vendors_list = vendorsData.vendors_request || [];
      this.requested_data = orderData.order_found || null;

      if (this.requested_data) {
        this.selectedProduct = this.products_list.find(
          p => p.row_id === this.requested_data.ProductId
        );

        this.selectedVendor = this.vendors_list.find(
          p => p.row_id === this.requested_data.VendorId
        );
      }
    } catch (error) {
      console.error('Initialization failed:', error);
    }
  }

  async PurchaseOrderEditSubmit(form: NgForm) {
    if (form.invalid) return;

    try {
      const res = await fetch('http://localhost:8080/purchase_order/update', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form.value)
      });

      const data = await res.json();
      console.log('Update success', data);

    } catch (error) {
      console.error('Update failed', error);
    }
  }

  productIdChange(product: any, form: NgForm) {
    if (!product) return;

    form.form.patchValue({
      productId: product.row_id,
      productName: product.Name,
      quantity: 1,
      totalAmount: product.Price
    });
  }

  productQuantityChange(quantity: number, form: NgForm) {
    const product = form.form.value.selectedProduct;
    if (!product || !quantity) return;

    form.form.patchValue({
      totalAmount: quantity * product.Price
    });
  }

  vendorChange(vendor:any, form:NgForm) {
    const sel_vendor = form.form.value.selectedVendor;
    if(!sel_vendor) return;

    form.form.patchValue({
      vendorId: vendor.row_id,
      vendorName: vendor.VendorName,
    })
  }
}
