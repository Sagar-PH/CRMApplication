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
  categories = [
    { _id: '1', name: 'Gadgets' },
    { _id: '2', name: 'Infirmary' },
    { _id: '3', name: 'Textiles' }
  ];

  requested_data: any
  id!: any

  ngOnInit() {
    this.id = this.route.snapshot.paramMap.get('id')!;

    fetch(`http://localhost:8080/products/edit/${this.id}`, {
      method: 'GET',
      credentials: 'include'
    }).then(res => res.json())
      .then(data => {
        console.log('fetch success', data)
        this.requested_data = data['product_found']
      })
      .catch(err => console.log('failed'))
  }

  ProductEditSubmit(ProductEditForm: any) {
    const selectedCategory = this.categories.find(c => c._id === ProductEditForm.value.categoryId);
    ProductEditForm.value.categoryName = selectedCategory ? selectedCategory.name : '';
    console.log(selectedCategory)

    fetch('http://localhost:8080/products/update', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ProductEditForm.value)
    }).then(res => res.json())
      .then(data => {
        console.log('update success', data)
      })
      .catch(err => console.log('update failed'))
  }
}
