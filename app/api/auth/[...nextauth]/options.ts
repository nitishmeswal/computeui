import NextAuth, { NextAuthOptions } from "next-auth"
import { SessionStrategy } from "next-auth"
// import NextAuthConfig from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import dbConnect from "@/app/lib/db"
import User from "@/app/model/User"
import bcrypt from "bcryptjs"
import { promises } from "dns"

const requiredEnvVars = [
  'GOOGLE_CLIENT_ID', 
  'GOOGLE_CLIENT_SECRET', 
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL'
];

requiredEnvVars.forEach(env => {
  if (!process.env[env]) {
    throw new Error(`Missing required environment variable: ${env}`)
  }
});
 
export const authConfig: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_SECRET!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email", placeholder: "Enter your email" },
        password: { label: "Password", type: "password", placeholder: "Enter your password" }
      },
      async authorize(credentials) : Promise<any> {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required')
        }
        try {
          await dbConnect()

          const user = await User.findOne({ 
            email: (credentials.email as string).toLowerCase() 
          }).select('+password')

          if (!user) {
            throw new Error('No user found with this email')
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password as string, 
            user.password
          )

          if (!isPasswordValid) {
            throw new Error('Invalid password')
          }

          return {
            id: user._id.toString(),
            email: user.email,
            name: `${user.firstName} ${user.lastName}`.trim()
          }
        } catch (error) {
          console.error('Authentication error:', error)
          throw error
        }
      }
    })
  ],
  
  pages: {
    signIn: '/login',
    signOut: '/',
    error: '/auth/error', 
  },

  callbacks: {
    async redirect({ url, baseUrl }) {
      return url.startsWith(baseUrl) ? url : baseUrl
    },
    async session({ session, token }) {
        if(token){
            // @ts-ignore
            session.user.id = token.id
            if (session.user && token.email && token.firstname) {
                session.user.email = token.email
            }
        }
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.firstName = user.firstname
        token.lastName = user.lastname
        token.email = user.email
      }
      return token
    }
  },

  session: {
    strategy: "jwt" as SessionStrategy,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  jwt: {
    secret: process.env.NEXTAUTH_SECRET,
  },

  debug: process.env.NODE_ENV === 'development',
  secret: process.env.NEXTAUTH_SECRET,
} 