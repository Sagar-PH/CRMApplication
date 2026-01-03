import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-create',
  imports: [FormsModule],
  templateUrl: './create.component.html',
  styleUrl: './create.component.css'
})
export class CreateComponent {

  PurchaseOrderSubmit(POrderForm: any) {
    fetch('http://localhost:8080/purchase_order/create', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(POrderForm.value)
    }).then(res => res.json())
      .then(data => {
        console.log('Puchase order Submit Success')
        POrderForm.reset()
      })
      .catch(err => console.log('Order Submit Failed'))
  }
}
