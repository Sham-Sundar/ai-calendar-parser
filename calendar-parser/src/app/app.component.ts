import { Component, OnInit, signal } from '@angular/core';
import { GoogleCalendarService } from './google-calendar.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  isSignedIn = signal(false);
  events = signal<any[]>([]);
  userProfile = signal<any>(null);

  constructor(private googleCalendarService: GoogleCalendarService) { }

  ngOnInit() {
    this.googleCalendarService.isSignedIn.subscribe(status => {
      this.isSignedIn.set(status);
    });

    this.googleCalendarService.events.subscribe(eventList => {
      this.events.set(eventList);
    });

    this.googleCalendarService.userProfile.subscribe(profile => {
      this.userProfile.set(profile);
    });
  }

  get eventList() {
    return this.events();
  }

  get profileImage() {
    return this.userProfile()?.picture || 'icons8-user-icon-96.png';
  }

  signIn() {
    this.googleCalendarService.signIn();
  }

  signOut() {
    this.googleCalendarService.signOut();
    this.isSignedIn.set(false);
    this.events.set([]);
    this.userProfile.set(null);

    // Clear localStorage
    localStorage.removeItem('google_access_token');
    localStorage.removeItem('google_user');
  }

  loadEvents() {
    this.googleCalendarService.fetchEvents();
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  }

}
