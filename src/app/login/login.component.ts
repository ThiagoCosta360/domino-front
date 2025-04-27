import { AfterViewInit, Component, ViewEncapsulation } from "@angular/core";
import { UserService } from "../../services/user.service";
import { Router } from "@angular/router";
import { FormsModule } from '@angular/forms';


@Component({
	selector: "app-login",
	templateUrl: "./login.component.html",
	styleUrls: ["./login.component.scss"],
	standalone: true,
	imports: [FormsModule],
	encapsulation: ViewEncapsulation.None
})
export class LoginComponent implements AfterViewInit {
	username: string | null;

	constructor(private userService: UserService, private router: Router) {	
		this.username = this.userService.getUser();
	}

	login() {
		if (!this.username) return

		this.userService.setUser(this.username);
		this.router.navigate(["/lobby"]);
	}

	ngAfterViewInit() {
		const canvas = document.getElementById('bg-canvas') as HTMLCanvasElement;
		const ctx = canvas.getContext('2d')!;
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;
		const particles = Array.from({ length: 50 }).map(() => createParticle());
	
		function createParticle() {
			return {
				x: Math.random() * canvas.width,
				y: Math.random() * canvas.height,
				size: Math.random() * 3 + 1,
				speed: Math.random() * 0.5 + 0.2,
				angle: Math.random() * 2 * Math.PI,
			};
		}
	
		function update() {
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			particles.forEach(p => {
				p.y -= p.speed;
				p.x += Math.sin(p.angle) * 0.3;
				if (p.y < -10) p.y = canvas.height + 10;
				ctx.fillStyle = 'rgba(255,255,255,0.2)';
				ctx.beginPath();
				ctx.arc(p.x, p.y, p.size, 0, 2 * Math.PI);
				ctx.fill();
			});
			requestAnimationFrame(update);
		}
		update();
		window.addEventListener('resize', () => {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
		});
	}
}

