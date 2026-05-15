import { Routes } from '@angular/router';
import { ChatComponent } from './features/chat/chat.component';
import { AdminComponent } from './features/admin/admin.component';
import { MetricasComponent } from './features/metricas/metricas.component';
import { LoginComponent } from './features/login/login.component';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'chat', pathMatch: 'full' },
  { path: 'chat', component: ChatComponent },
  { path: 'login', component: LoginComponent },
  { path: 'admin', component: AdminComponent, canActivate: [authGuard] },
  { path: 'metricas', component: MetricasComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: 'chat' }
];