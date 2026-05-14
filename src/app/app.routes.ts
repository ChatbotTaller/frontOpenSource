import { Routes } from '@angular/router';
import { ChatComponent } from './features/chat/chat.component';
import { AdminComponent } from './features/admin/admin.component';

export const routes: Routes = [
  { path: '', redirectTo: 'chat', pathMatch: 'full' },
  { path: 'chat', component: ChatComponent },
  { path: 'admin', component: AdminComponent }
];