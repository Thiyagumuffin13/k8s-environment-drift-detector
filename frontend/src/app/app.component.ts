import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HttpClient } from '@angular/common/http';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatIconModule, MatTooltipModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'drift-detector-ui';
  isApiHealthy = true;
  apiStatusMessage = 'API Connected';

  private http = inject(HttpClient);
  private healthCheckSub?: Subscription;

  ngOnInit() {
    this.checkHealth();
    // Poll the backend health API every 10 seconds
    this.healthCheckSub = interval(10000).subscribe(() => this.checkHealth());
  }

  ngOnDestroy() {
    this.healthCheckSub?.unsubscribe();
  }

  private checkHealth() {
    // We hit the backend API (proxied via Nginx)
    this.http.get('/api/health', { observe: 'response' }).subscribe({
      next: () => {
        this.isApiHealthy = true;
        this.apiStatusMessage = 'API is Connected';
      },
      error: () => {
        this.isApiHealthy = false;
        this.apiStatusMessage = 'API Disconnected';
      }
    });
  }
}
