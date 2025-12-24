import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})

export class DashboardComponent {
  constructor(
    private router: Router,
    public authService: AuthService
  ) {}

  logout() {
    fetch("http://localhost:8080/logout", {
      method: "POST",
      credentials: "include"
    }).then(() => {
      this.authService.setLoggedIn(false);
      this.router.navigate(['/login']);
    });
  }

}
