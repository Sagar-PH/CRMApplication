import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private authenticate = new BehaviorSubject<boolean>(false);
  public auth_observer = this.authenticate.asObservable();

  private isloading = new BehaviorSubject<boolean>(true);
  public load_observer = this.isloading.asObservable();

  initAuth() {
    fetch('http://localhost:8080/auth/check', {
      credentials: 'include'
    }).then(res => res.json())
      .then(data => {
        this.authenticate.next(data.authenticated)
        this.isloading.next(false)
      }).catch(err => this.authenticate.next(false));
  }

  setLoggedIn(status: boolean) {
    this.authenticate.next(status)
  }

  isLoggedIn(): boolean {
    return this.authenticate.value;
  }

  setLoadingState(status: boolean) {
    this.isloading.next(status)
  }

  getLoadingState(): boolean {
    return this.isloading.value;
  }
}
