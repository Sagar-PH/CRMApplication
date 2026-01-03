import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-create',
  imports: [FormsModule],
  templateUrl: './create.component.html',
  styleUrl: './create.component.css'
})
export class CreateComponent {
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
}
