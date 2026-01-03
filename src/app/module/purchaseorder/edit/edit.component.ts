import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-edit',
  imports: [FormsModule, CommonModule],
  templateUrl: './edit.component.html',
  styleUrl: './edit.component.css'
})

export class EditComponent {
  constructor(private route: ActivatedRoute) { }

  requested_data: any
  id!: any

  ngOnInit() {
    this.id = this.route.snapshot.paramMap.get('id')!;

    fetch(`http://localhost:8080/purchase_order/edit/${this.id}`, {
      method: 'GET',
      credentials: 'include'
    }).then(res => res.json())
      .then(data => {
        console.log('fetch success', data)
        this.requested_data = data['order_found']
      })
      .catch(err => console.log('failed'))
  }

  PurchaseOrderEditSubmit(POrderEditForm:any) {
    fetch('http://localhost:8080/purchase_order/update', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(POrderEditForm.value)
    }).then(res => res.json())
      .then(data => {
        console.log('update success', data)
      })
      .catch(err => console.log('update failed'))
  }

}
