import { CommonModule } from '@angular/common';
import { Component, OnInit, HostListener, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OpnameAssetComponent } from '../opname-asset/opname-asset.component';
import { ApiService } from '../services/api.service';
import { OpnameSessionService } from '../services/opname-session.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-opname-page',
  standalone: true,
  imports: [CommonModule, FormsModule, OpnameAssetComponent],
  templateUrl: './opname-page.component.html',
  styleUrl: './opname-page.component.scss'
})
export class OpnamePageComponent implements OnInit, OnDestroy {
  currentView: 'large' | 'small' = 'large';
  isMobile: boolean = false;
  
  constructor(private apiService: ApiService, private route: ActivatedRoute, private router: Router, private opnameSessionService: OpnameSessionService) {}
  
  cardVariant: 'default' | 'compact' = 'compact';
  showLocation: boolean = true;
  sessionID: number = -1; // Default value, will be set later
  siteID: number = -1; // Site ID for the current opname session
  isLoading: boolean = true; // Loading state for the opname session
  errorMessage: string = ''; // Error message for the opname session
  private subscription?: Subscription; // Subscription to manage service state

  ngOnInit() {
    this.checkScreenSize();
    this.siteID = Number(this.route.snapshot.paramMap.get('id')); // Get site ID from route parameters
    this.initializeSessionId();
    this.isLoading = false;
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  private initializeSessionId() {
    this.isLoading = true;
    
    // Method 1: Try to get from service (which now also checks localStorage)
    const serviceSessionId = this.opnameSessionService.getSessionId();
    if (serviceSessionId && serviceSessionId > 0) {
      this.sessionID = serviceSessionId;
      console.log('[OpnamePage] Session ID from service/localStorage:', this.sessionID);
      
      // If we have a session ID but no site ID from route, try to get it from localStorage
      if (this.siteID <= 0) {
        const siteid = this.opnameSessionService.getSiteId();
        if (siteid && siteid > 0) {
          this.siteID = siteid;
          console.log('[OpnamePage] Site ID from localStorage:', this.siteID);
        }
      }
      return;
    }

    // Method 2: Try to get from router state (navigation extras)
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras?.state?.['sessionId']) {
      this.sessionID = navigation.extras.state['sessionId'];
      console.log('[OpnamePage] Session ID from router state:', this.sessionID);
      this.opnameSessionService.setSessionId(this.sessionID); // Also saves to localStorage
      return;
    }

    // Method 3: Try to get from history.state (direct navigation)
    if (history.state?.sessionId) {
      this.sessionID = history.state.sessionId;
      console.log('[OpnamePage] Session ID from history state:', this.sessionID);
      this.opnameSessionService.setSessionId(this.sessionID); // Also saves to localStorage
      return;
    }

    // If no session ID found, show error
    console.error('[OpnamePage] No session ID found in any source');
    
    // If we have a site ID, navigate back to that site
    if (this.siteID > 0) {
      this.router.navigate(['/site', this.siteID]);
    } else {
      // If we don't have a site ID either, navigate to dashboard
      this.router.navigate(['']);
    }
    
    this.errorMessage = 'No opname session found. Please start a new session.';
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.checkScreenSize();
    this.updateResponsiveSettings();
  }

  cancelOpnameSession() {
    console.log('[OpnamePage] cancelOpnameSession() called');
    console.log('[OpnamePage] Current session ID:', this.sessionID);
    
    if (this.sessionID <= 0) {
      console.error('[OpnamePage] Invalid session ID:', this.sessionID);
      this.errorMessage = 'Invalid opname session.';
      return;
    }
    
    this.isLoading = true; // Set loading state to true before cancelling
    console.log('[OpnamePage] About to call API to cancel session:', this.sessionID);
    
    this.opnameSessionService.cancelOpnameSession(this.sessionID).subscribe({
      next: (response) => {
        this.isLoading = false; // Set loading state to false after cancelling
        console.log('[OpnamePage] Opname session cancelled successfully:', response);
        
        // Clear the session from the service and localStorage
        this.opnameSessionService.clearSession();
        
        // Navigate back to the site page
        console.log('[OpnamePage] Navigating back to site:', this.siteID);
        this.router.navigate(['/site', this.siteID]);
      },
      error: (error) => {
        this.isLoading = false; // Set loading state to false on error
        this.errorMessage = 'Failed to cancel opname session. Please try again later.';
        console.error('[OpnamePage] Error cancelling opname session:', error);
      }
    });
  }

  private checkScreenSize() {
    this.isMobile = window.innerWidth < 768; // Define mobile breakpoint
    
    if (this.isMobile) {
      this.currentView = 'small'; // Force list view on mobile
    } else {
      this.currentView = 'large'; // Default to card view on desktop
    }
  }

  private updateResponsiveSettings() {
    if (window.innerWidth >= 768) {
      // Large screens: use compact variant with location
      this.cardVariant = 'compact';
      this.showLocation = true;
    } else {
      // Small screens: use default variant without location
      this.cardVariant = 'default';
      this.showLocation = false;
    }
  }
}