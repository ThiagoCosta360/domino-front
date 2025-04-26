import { Component } from '@angular/core';
import { Router, RouterModule, RouterOutlet } from '@angular/router';
import { UserService } from '../services/user.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'Encontro das Pedras';

	constructor(private userService: UserService, private router: Router) {	
		if (this.userService.getUser()) 
			this.router.navigate(["/lobby"]);
	}
}
