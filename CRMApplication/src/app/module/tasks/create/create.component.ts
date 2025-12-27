import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-create',
  imports: [FormsModule],
  templateUrl: './create.component.html',
  styleUrl: './create.component.css'
})
export class CreateComponent {
  TaskSubmit(TaskForm: any) {
    fetch('http://localhost:8080/tasks/create', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TaskForm.value)
    }).then(res => res.json())
      .then(data => {
        console.log('submit success', data);
        TaskForm.reset()
      })
      .catch(err => console.log('submit failed'))
  }
}
