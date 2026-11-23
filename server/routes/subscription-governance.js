import { Router } from 'express';
import { z } from 'zod';
import { withTenant } from '../db.js';
import { requireSubscriptionAdmin,requireSubscriptionCapability } from '../subscription-permissions.js';
import { listSubscriptionOperators,setSubscriptionOperator,listSubscriptionPolicies,saveSubscriptionPolicy } from '../subscription-governance.js';

export const subscriptionGovernanceRouter=Router();
subscriptionGovernanceRouter.use('/subscriptions/admin',requireSubscriptionAdmin);
subscriptionGovernanceRouter.get('/subscriptions/admin/access',(req,res)=>res.json(req.subscriptionAccess));
subscriptionGovernanceRouter.get('/subscriptions/admin/operators',requireSubscriptionCapability('operators.manage'),async(req,res)=>{
 res.json({operators:await withTenant(req.auth.tenantId,client=>listSubscriptionOperators(client,req.auth))});
});
subscriptionGovernanceRouter.patch('/subscriptions/admin/operators/:id',requireSubscriptionCapability('operators.manage'),async(req,res)=>{
 const id=z.string().uuid().parse(req.params.id);
 res.json(await withTenant(req.auth.tenantId,client=>setSubscriptionOperator(client,req.auth,id,req.body)));
});
subscriptionGovernanceRouter.get('/subscriptions/admin/policies',requireSubscriptionCapability('read'),async(req,res)=>{
 res.json(await withTenant(req.auth.tenantId,client=>listSubscriptionPolicies(client,req.auth)));
});
subscriptionGovernanceRouter.post('/subscriptions/admin/policies',requireSubscriptionCapability('policies.manage'),async(req,res)=>{
 const policy=await withTenant(req.auth.tenantId,client=>saveSubscriptionPolicy(client,req.auth,req.body));
 res.status(201).json({policy,automaticDeletion:false,message:'Versión registrada. Esta operación no cancela cuentas ni elimina información.'});
});
