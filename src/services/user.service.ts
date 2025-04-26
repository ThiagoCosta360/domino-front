import { Injectable } from '@angular/core';

@Injectable({
	providedIn: 'root'
})
export class UserService {

  setUser(name: string) :void{
    if(name.trim() == '') {
      throw new Error('Username cannot be empty');
    }
    localStorage.setItem('user', name);
  }

  getUser(): string | null {
		return localStorage.getItem('user');
  }

	logout(): void {
		localStorage.removeItem('user');
	}
}