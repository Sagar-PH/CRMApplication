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
  products:any;

  ngOnInit() {
    fetch('http://localhost:8080/products/view', {
      method: 'GET',
      credentials: 'include'
    }).then(res => res.json())
      .then(data => {
        this.products = data['products_request']
        console.log('Products View', data['products_request'])
      })
      .catch(err => console.log('Order Submit Failed'))
  }
}
