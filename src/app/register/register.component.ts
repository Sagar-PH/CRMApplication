import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  constructor(
    private router: Router,
    private authService: AuthService,
  ) {
    this.authService.auth_observer.subscribe(isLoggedIn => {
      // console.log(' -- Logged :: ', isLoggedIn)
      if (isLoggedIn) this.router.navigateByUrl('/dashboard');
    })
  }

  errorMessage: String = '';

  RegisterSubmit(form: any) {
    fetch('http://localhost:8080/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form.value)
    })
      .then(res => res.json())
      .then(data => {
        console.log(data);
        if (['Success', 'Redirect'].includes(data['status'])) {
          this.router.navigate(['/login']);
        } else {
          this.errorMessage = data.status;
        }
      })
      .catch(error => console.error('Error:', error));

    console.log('Register Submitted', form.value)
  }
}
