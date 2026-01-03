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
  errorMessage = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    this.authService.auth_observer.subscribe(isLoggedIn => {
      // console.log(' -- Logged :: ', isLoggedIn)
      if (isLoggedIn) this.router.navigateByUrl('/dashboard');
    })
  }

  LoginSubmit(form: any) {
    fetch('http://localhost:8080/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form.value)
    })
      .then(res => res.json())
      .then(data => {
        if (['Success', 'Redirect'].includes(data.status)) {
          this.authService.setLoggedIn(true);
          this.router.navigateByUrl('/dashboard');
        } else {
          this.errorMessage = data.status;
        }
      })
      .catch(() => {
        this.errorMessage = 'Login failed';
      });
  }
}
