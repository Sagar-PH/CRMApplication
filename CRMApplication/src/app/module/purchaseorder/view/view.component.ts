import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-view',
  imports: [RouterLink, CommonModule],
  templateUrl: './view.component.html',
  styleUrl: './view.component.css'
})
export class ViewComponent {
  purchase_orders: any;

  ngOnInit() {
    fetch('http://localhost:8080/purchase_order/view', {
      method: 'GET',
      credentials: 'include'
    }).then(res => res.json())
      .then(data => {
        this.purchase_orders = data['orders_request']
        console.log('Puchase order View', data['orders_request'])
      })
      .catch(err => console.log('Order Submit Failed'))
  }
}
