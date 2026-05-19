import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

  usuario = '';
  password = '';
  error = '';

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {

    const token = localStorage.getItem('admin_token');

    if (token) {
      this.router.navigate(['/admin']);
    }

  }

  login() {

    this.error = '';

    this.http.post<any>('https://backendopensource-production.up.railway.app/auth/login', {
      usuario: this.usuario,
      password: this.password
    }).subscribe({

      next: (res) => {

        localStorage.setItem('admin_token', res.token);

        this.router.navigate(['/admin']);

      },

      error: () => {

        this.error = 'Credenciales incorrectas';

      }

    });

  }

}