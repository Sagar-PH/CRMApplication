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
  contacts:any;

  ngOnInit() {
    fetch('http://localhost:8080/contacts/view', {
      method: 'GET',
      credentials: 'include'
    }).then(res => res.json())
      .then(data => {
        this.contacts = data['orders_request']
        console.log('sales order View', data['orders_request'])
      })
      .catch(err => console.log('Order Submit Failed'))
  }
}
