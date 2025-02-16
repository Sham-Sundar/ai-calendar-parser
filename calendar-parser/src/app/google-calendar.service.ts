import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

declare global {
  interface Window {
    google: any;
    gapi: any;
  }
}

declare var google: any;
declare var gapi: any;

@Injectable({
  providedIn: 'root'
})
export class GoogleCalendarService {
  private CLIENT_ID = '800641135611-172qpkuhuasosaiijtk3njok4ogo1tl7.apps.googleusercontent.com';
  private API_KEY = 'AIzaSyDX3YE0DH3pgUSrFuIqBDUH7qW48rNhZJ0';
  private DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"];
  private SCOPES = "https://www.googleapis.com/auth/calendar.readonly profile email";

  public isSignedIn = new BehaviorSubject<boolean>(false);
  public events = new BehaviorSubject<any[]>([]);
  public userProfile = new BehaviorSubject<any>(null);

  private tokenClient: any;

  constructor() {
    this.loadGoogleAPI();
  }

  private loadGoogleAPI() {
    if (!window.google || !window.google.accounts) {
      console.error("❌ Google Identity Services (GIS) not loaded.");
      return;
    }

    this.tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: this.CLIENT_ID,
      scope: this.SCOPES,
      callback: (response: any) => {
        if (response.access_token) {
          localStorage.setItem('google_access_token', response.access_token);
          this.isSignedIn.next(true);
          console.log("✅ Access Token Stored:", response.access_token);

          this.fetchUserProfile(response.access_token);
          this.initializeGapiClient();
        } else {
          console.error("❌ Google sign-in failed:", response);
        }
      },
    });

    this.initializeGapiClient();
  }

  private initializeGapiClient() {
    if (!window.gapi) {
      console.warn("⏳ Waiting for gapi to load...");
      setTimeout(() => this.initializeGapiClient(), 500);
      return;
    }

    gapi.load('client', async () => {
      await gapi.client.init({
        apiKey: this.API_KEY,
        discoveryDocs: this.DISCOVERY_DOCS
      }).then(() => {
        console.log("✅ Google Calendar API initialized.");
        this.checkExistingSession();
      }).catch((error: any) => console.error("❌ Error initializing Google API:", error));
    });
  }

  private checkExistingSession() {
    const storedToken = localStorage.getItem('google_access_token');
    const storedUser = localStorage.getItem('google_user');
  
    if (storedToken) {
      console.log('✅ Existing Google session found.');
      this.isSignedIn.next(true);
      this.fetchEvents();
  
      // If user profile exists in localStorage, load it
      if (storedUser) {
        this.userProfile.next(JSON.parse(storedUser));
      } else {
        this.fetchUserProfile(storedToken);
      }
    }
  }
  

  fetchUserProfile(accessToken: string) {
    fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    .then(response => response.json())
    .then(data => {
      console.log("✅ User Profile Data:", data);
      
      // Store profile info in localStorage
      localStorage.setItem('google_user', JSON.stringify(data));
      
      // Update userProfile observable
      this.userProfile.next(data);
    })
    .catch(error => console.error("❌ Error fetching user profile:", error));
  }
  

  signIn() {
    this.tokenClient.requestAccessToken();
    console.log("🔹 Requesting Google Access Token...");
  }

  signOut() {
    const accessToken = localStorage.getItem('google_access_token');
    if (accessToken) {
      google.accounts.oauth2.revoke(accessToken, () => {
        console.log('✅ User signed out successfully');
        this.isSignedIn.next(false);
        this.events.next([]);
        this.userProfile.next(null);
        localStorage.removeItem('google_access_token');
        localStorage.removeItem('google_user');
      });
    }
  }

  fetchEvents() {
    if (!window.gapi || !gapi.client || !gapi.client.calendar) {
      console.warn("⏳ Google Calendar API is still loading, retrying in 500ms...");
      setTimeout(() => this.fetchEvents(), 500);
      return;
    }
    
    const accessToken = localStorage.getItem('google_access_token');
    if (!accessToken) {
      console.error("❌ No access token found. User might be signed out.");
      return;
    }
    
    gapi.client.setToken({ access_token: accessToken });
    gapi.client.calendar.events.list({
      calendarId: 'primary',
      showDeleted: false,
      singleEvents: true,
      maxResults: 50,
      orderBy: 'startTime'
    }).then((response: any) => {
      this.events.next(response.result.items || []);
      console.log("✅ Fetched events successfully:", response.result.items);
    }).catch((error: any) => console.error('❌ Error fetching events:', error));
  }
}
