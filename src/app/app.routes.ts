import { Routes } from '@angular/router';
import { ChatComponent } from './features/chat/chat.component';
import { AdminComponent } from './features/admin/admin.component';
import { MetricasComponent } from './features/metricas/metricas.component';
import { LoginComponent } from './features/login/login.component';
import { authGuard } from './core/guards/auth.guard';
import { DniLoginComponent } from './features/dni-login/dni-login.component';
import { ChatSelectorComponent } from './features/chat-selector/chat-selector.component';
import { clienteAuthGuard } from './core/guards/cliente-auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'dni-login', pathMatch: 'full' },
  { path: 'dni-login', component: DniLoginComponent },
  { path: 'seleccionar-chat', component: ChatSelectorComponent, canActivate: [clienteAuthGuard] },
  { path: 'chat', component: ChatComponent, canActivate: [clienteAuthGuard] },
  { path: 'login', component: LoginComponent },
  { path: 'admin', component: AdminComponent, canActivate: [authGuard] },
  { path: 'metricas', component: MetricasComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: 'dni-login' }
];