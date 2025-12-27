import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-create',
  imports: [FormsModule],
  templateUrl: './create.component.html',
  styleUrl: './create.component.css'
})
export class CreateComponent {
  VendorSubmit(VendorForm:any) {
    fetch('http://localhost:8080/vendors/create', {
      method: 'POST',
      headers: {'Content-type': 'application/json'},
      credentials: 'include',
      body: JSON.stringify(VendorForm.value)
    }).then(res => res.json())
    .then(data=>{
      console.log('Submit Success', data)
      VendorForm.reset()
    })
    .catch(err => console.log('Order Submit Failed'))
  }
}
