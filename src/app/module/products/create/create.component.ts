import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-create',
  imports: [FormsModule, CommonModule],
  templateUrl: './create.component.html',
  styleUrl: './create.component.css'
})
export class CreateComponent {
  categories = [
    { _id: '1', name: 'Gadgets' },
    { _id: '2', name: 'Infirmary' },
    { _id: '3', name: 'Textiles' }
  ];


  ProductSubmit(ProductForm: any) {
    const selectedCategory = this.categories.find(c => c._id === ProductForm.value.categoryId);
    ProductForm.value.categoryName = selectedCategory ? selectedCategory.name : '';

    fetch('http://localhost:8080/products/create', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ProductForm.value)
    }).then(res => res.json())
      .then(data => {
        console.log('submit success', data)
        ProductForm.reset()
      })
      .catch(err => console.log('submit failed'))
  }

}
