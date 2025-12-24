import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private loggedIn = false;

  async initAuth() {
    const res = await fetch('http://localhost:8080/auth/check', {
      credentials: 'include'
    });
    const data = await res.json();
    this.loggedIn = data.authenticated;
  }

  setLoggedIn(status: boolean) {
    this.loggedIn = status;
  }

  isLoggedIn(): boolean {
    return this.loggedIn;
  }
}
