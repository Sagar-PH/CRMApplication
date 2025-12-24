import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../auth.service';


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})

export class LoginComponent {
  constructor(
    private router: Router,
    public authService: AuthService
  ) {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/dashboard'])
    }
  }
  
  errorMessage: String = '';

  LoginSubmit(form:any) {
    fetch('http://localhost:8080/login', {
      method: 'POST',
      credentials: "include",
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form.value)
    })
    .then(res => res.json())
    .then(data => {
      console.log(data);
      if (['Success', 'Redirect'].includes(data['status'])) {
        this.authService.setLoggedIn(true);
        this.router.navigate(['/dashboard']);
      } else {
        this.errorMessage = data.status;
      }
    })
    .catch(error => console.error('Error:', error));

    console.log('Login Submitted', form.value)
  }
}
