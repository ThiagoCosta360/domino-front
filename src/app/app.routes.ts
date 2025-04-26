import { Routes } from '@angular/router';
import { GameComponent } from './game/game.component';
import { LoginComponent } from './login/login.component';
import { LobbyComponent } from './lobby/lobby.component';

export const routes: Routes = [
  { 
		path: 'game', component: GameComponent 
	},
	{
		path: 'login', component: LoginComponent
	},
	{
		path: 'lobby', component: LobbyComponent
	}
];
