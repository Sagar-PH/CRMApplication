import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-view',
  imports: [RouterLink, FormsModule, CommonModule],
  templateUrl: './view.component.html',
  styleUrl: './view.component.css'
})
export class ViewComponent {
  sales_orders:any;

  ngOnInit() {
    fetch('http://localhost:8080/sales_order/view', {
      method: 'GET',
      credentials: 'include'
    }).then(res => res.json())
      .then(data => {
        this.sales_orders = data['orders_request']
        console.log('sales order View', data['orders_request'])
      })
      .catch(err => console.log('Order Submit Failed'))
  }
}
