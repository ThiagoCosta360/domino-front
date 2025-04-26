import { Component } from "@angular/core";
import { UserService } from "../../services/user.service";
import { Router } from "@angular/router";
import { FormsModule } from '@angular/forms';


@Component({
	selector: "app-login",
	templateUrl: "./login.component.html",
	styleUrls: ["./login.component.scss"],
	standalone: true,
	imports: [FormsModule]
})
export class LoginComponent {
	username: string | null;

	constructor(private userService: UserService, private router: Router) {	
		this.username = this.userService.getUser();
	}

	login() {
		if (!this.username) return

		this.userService.setUser(this.username);
		this.router.navigate(["/lobby"]);
	}
}