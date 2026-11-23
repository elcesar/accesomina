import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validatePassword } from '../security.js';
import { acceptUserInvitation,invitationInput,verifyUserInvitation } from '../user-invitations.js';

export const invitationsRouter = Router();
const limiter = rateLimit({windowMs:15*60_000,limit:20,standardHeaders:true,legacyHeaders:false});

invitationsRouter.post('/verify',limiter,async(req,res)=>{
  const input = invitationInput(req.body);
  if (!input) return res.status(400).json({error:'INVALID_INVITATION_REQUEST'});
  res.json(await verifyUserInvitation(input));
});

invitationsRouter.post('/accept',limiter,async(req,res)=>{
  const input = invitationInput(req.body);
  if (!input) return res.status(400).json({error:'INVALID_INVITATION_REQUEST'});
  if (!validatePassword(req.body?.newPassword)) return res.status(400).json({error:'WEAK_PASSWORD'});
  if (req.body.newPassword !== req.body.confirmPassword) return res.status(400).json({error:'INVITATION_PASSWORD_MISMATCH'});
  await acceptUserInvitation({...input,newPassword:req.body.newPassword});
  res.status(204).end();
});
