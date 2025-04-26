import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  setUser(name: string) {
    localStorage.setItem('user', name);
  }

  getUser(): string | null {
		return localStorage.getItem('user');
  }

	logout(): void {
		localStorage.removeItem('user');
	}

}