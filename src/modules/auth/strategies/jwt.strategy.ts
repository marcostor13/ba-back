import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { jwtConstants } from '../constants/jwt.constants';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor() {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: jwtConstants.secret, // Define este valor en un archivo de constantes o variable de entorno
        });
    }

    async validate(payload: any) {
        // El payload debe contener, por ejemplo, { email, sub: id }
        return { userId: payload.sub, email: payload.email };
    }
}