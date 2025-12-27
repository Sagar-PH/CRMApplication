import { Component } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AuthService } from '../../auth.service';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.css'
})

export class MainLayoutComponent {
  constructor(
    private router: Router,
    public authService: AuthService
  ) { }

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
