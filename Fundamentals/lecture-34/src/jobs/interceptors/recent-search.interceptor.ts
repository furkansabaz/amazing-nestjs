import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    ServiceUnavailableException,
  } from "@nestjs/common";
  import { of, throwError } from "rxjs";
  import { tap, catchError } from "rxjs/operators";
  import { Job } from "../interfaces/job.class";
  import { RecentSearchService } from "../services/recent-search.service";
  
  @Injectable()
  export class RecentSearchInterceptor implements NestInterceptor {
    constructor(private readonly recentSearchService: RecentSearchService) {}
  
    intercept(context: ExecutionContext, next: CallHandler) {
      const request = context.switchToHttp().getRequest();
  
      const { token, query } = request.query;
  
      const cachedRecentList = this.recentSearchService.findByTokenAndQuery(
        token,
        query
      );
  
      if (cachedRecentList.length) {
        console.log("[RecentSearchInterceptor]: Sending Cached list");
  
        const recentList = cachedRecentList.reduce((accList, cachedResult) => {
          accList.push(...cachedResult.list);
          return accList;
        }, []);
  
        return of(recentList);
      }

      console.log("[RecentSearchInterceptor]: Sending Non-Cached list");
  
      return next.handle().pipe(
        tap((list: Job[]) => {
          if (token && query?.trim().length) {
            this.recentSearchService.addRecentSerach(token, query, list);
          }
        }),
        catchError((err) => {
          return throwError(() => new ServiceUnavailableException(err?.message));
        })
      );
    }
  }
  