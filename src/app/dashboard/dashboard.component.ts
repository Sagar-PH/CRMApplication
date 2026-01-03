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
  sales_count: Number = 0;
  purchase_count: Number = 0;
  tasks_count: Number = 0;
  contacts_count: Number = 0;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    this.authService.auth_observer.subscribe(isLoggedIn => {
      if (!isLoggedIn) {
        this.router.navigateByUrl('/login');
      }
    })
  }

  ngOnInit() {
    fetch('http://localhost:8080/dashboard', {
      method: 'GET',
      credentials: 'include'
    }).then(res => res.json())
    .then(data => {
      console.log(data)
      this.sales_count = data['sales'].length
      this.purchase_count = data['purchase'].length
      this.tasks_count = data['tasks'].length
      this.contacts_count = data['contacts'].length

    })
  }
}
