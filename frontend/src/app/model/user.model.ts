export class User {
    constructor(
        public userID: number = 0,
        public username: string = '',
        public firstName: string = '',
        public lastName: string = '',
        public position: string = '',
        public siteName: string = '',
        public siteGroupName: string = '',
        public regionName: string = '',
        public costCenterID: number = 0,
    ) {}
}