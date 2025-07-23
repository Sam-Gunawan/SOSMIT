import { Injectable } from "@angular/core";
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from "@angular/common/http";
import { Observable } from "rxjs";

@Injectable({
    providedIn: 'root'
})
export class AuthInterceptor implements HttpInterceptor {
    constructor() {}

    onNgInit() {
        console.log("[AuthInterceptor] Initialized");
    }

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        // Get auth token from local storage
        const auth_token = localStorage.getItem("auth_token")
        // console.log("[AuthInterceptor] Intercepting request:", req.url);
        // console.log("[AuthInterceptor] Auth token found:", auth_token);

        // If auth token exists, clone the request and add the Authorization header
        if (auth_token) {
            // Log the token for debugging purposes
            // console.log("[AuthInterceptor ] Adding Authorization header with token:", auth_token);

            // Clone the request to add the new header
            // This is necessary because HttpRequest is immutable, so we cannot modify it directly
            const clonedReq = req.clone({
                headers: req.headers.set('Authorization', `Bearer ${auth_token}`)
            });

            // Pass the cloned request instead of the original request to the next handler
            return next.handle(clonedReq);
        }

        // If no auth token, pass the original request
        return next.handle(req);
    }
}