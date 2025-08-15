import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { 
  User, 
  Clock, 
  Scissors, 
  CreditCard, 
  CheckCircle,
  Building,
  Phone,
  MapPin,
  DollarSign,
  Loader
} from 'lucide-react';

type Step = 'account' | 'hours' | 'services' | 'payouts';

const STEPS: Step[] = ['account', 'hours', 'services', 'payouts'];

export default function BarberOnboardingEngine() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [hasHours, setHasHours] = useState(false);
  const [hasServices, setHasServices] = useState(false);
  const [stripeReady, setStripeReady] = useState(false);
  const navigate = useNavigate();

  // Read ?step; if invalid we'll correct it after we fetch progress
  const step: Step = useMemo(() => {
    const s = (params.get('step') || '').toLowerCase() as Step;
    return (STEPS as readonly string[]).includes(s) ? (s as Step) : 'account';
  }, [params]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        if (!user) {
          navigate('/login?next=%2Fonboarding%2Fbarber', { replace: true });
          return;
        }

        // 1) Ensure a barber profile row exists
        const { data: prof } = await supabase
          .from('barber_profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!prof) {
          await supabase.from('barber_profiles').insert({
            user_id: user.id,
            business_name: user.user_metadata?.business_name || `${user.user_metadata?.first_name || 'New'} Barber Shop`,
            owner_name: `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() || 'Barber',
            email: user.email || '',
            is_claimed: true,
            is_active: false,
            slug: `barber-${user.id.slice(0, 8)}`
          });
        }

        const { data: prof2 } = await supabase
          .from('barber_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        setProfile(prof2);

        // 2) Progress checks (infer from existing tables)
        const { count: availabilityCount } = await supabase
          .from('availability')
          .select('id', { count: 'exact', head: true })
          .eq('barber_id', prof2.id)
          .eq('is_available', true);

        setHasHours((availabilityCount || 0) > 0);

        const { count: servicesCount } = await supabase
          .from('services')
          .select('id', { count: 'exact', head: true })
          .eq('barber_id', prof2.id)
          .eq('is_active', true);

        setHasServices((servicesCount || 0) > 0);

        setStripeReady(!!prof2?.stripe_onboarding_completed);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [navigate, user]);

  // Decide the next step based on progress
  function computeNext(): Step {
    if (!profile?.business_name || !profile?.city || !profile?.state || !profile?.phone) return 'account';
    if (!hasHours) return 'hours';
    if (!hasServices) return 'services';
    if (!stripeReady) return 'payouts';
    return 'payouts';
  }

  // Normalize the current step to the next required one
  useEffect(() => {
    if (loading) return;
    const required = computeNext();
    // If current step is ahead of progress, bump back
    const idxCurrent = STEPS.indexOf(step);
    const idxRequired = STEPS.indexOf(required);
    if (idxCurrent < 0 || idxCurrent < idxRequired) {
      const next = new URLSearchParams(params);
      next.set('step', required);
      setParams(next, { replace: true });
    }
  }, [loading, step, hasHours, hasServices, stripeReady, profile, params, setParams]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-100 border-t-primary-500 mx-auto"></div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary-500 to-accent-500 opacity-20 blur-lg"></div>
          </div>
          <div className="space-y-2">
            <p className="text-gray-700 font-medium">Setting up your barber account...</p>
            <p className="text-sm text-gray-500">Preparing your onboarding experience</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 page-container">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <img 
              src="/Kutable Logo.png" 
              alt="Kutable Logo" 
              className="h-12 w-auto"
            />
            <span className="text-2xl font-bold text-gray-900">Kutable</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete Your Setup</h1>
          <p className="text-gray-600">Let's get your barber profile ready for customers</p>
        </div>

        <ProgressHeader step={step} />
        
        {step === 'account' && <StepAccount profile={profile} onSaved={() => goto('hours')} />}
        {step === 'hours' && <StepHours profileId={profile?.id} onSaved={() => goto('services')} />}
        {step === 'services' && <StepServices profileId={profile?.id} onSaved={() => goto('payouts')} />}
        {step === 'payouts' && <StepPayouts />}
      </div>
    </div>
  );

  function goto(s: Step) {
    const next = new URLSearchParams(params);
    next.set('step', s);
    setParams(next);
  }
}

function ProgressHeader({ step }: { step: Step }) {
  const idx = STEPS.indexOf(step);
  const stepIcons = [User, Clock, Scissors, CreditCard];
  
  return (
    <div className="mb-8">
      <div className="text-sm text-gray-600 mb-4 text-center">Step {idx + 1} of {STEPS.length}</div>
      <div className="flex items-center justify-between mb-4">
        {STEPS.map((s, i) => {
          const Icon = stepIcons[i];
          const isActive = i === idx;
          const isCompleted = i < idx;
          
          return (
            <div key={s} className="flex items-center">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${
                isActive 
                  ? 'bg-primary-500 text-white shadow-lg' 
                  : isCompleted 
                  ? 'bg-emerald-500 text-white' 
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {isCompleted ? (
                  <CheckCircle className="h-6 w-6" />
                ) : (
                  <Icon className="h-6 w-6" />
                )}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-16 h-1 mx-2 transition-all duration-200 ${
                  i < idx ? 'bg-emerald-500' : 'bg-gray-200'
                }`} />
              )}
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-xs text-gray-500 font-medium">
        <span>Account</span>
        <span>Hours</span>
        <span>Services</span>
        <span>Payouts</span>
      </div>
    </div>
  );
}

/* ---------- ACCOUNT STEP ---------- */
function StepAccount({ profile, onSaved }: { profile: any, onSaved: () => void }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    business_name: profile?.business_name || '',
    owner_name: profile?.owner_name || '',
    phone: profile?.phone || '',
    city: profile?.city || '',
    state: profile?.state || '',
    zip_code: profile?.zip_code || '',
    bio: profile?.bio || ''
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!user || !profile) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('barber_profiles')
        .update({
          ...form,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id);
        
      if (error) throw error;
      onSaved();
    } catch (error) {
      console.error('Error saving account info:', error);
    } finally {
      setSaving(false);
    }
  }

  const isValid = form.business_name && form.owner_name && form.phone && form.city && form.state;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
      <div className="flex items-center space-x-3 mb-6">
        <div className="bg-primary-100 p-3 rounded-2xl">
          <Building className="h-6 w-6 text-primary-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Business Information</h2>
          <p className="text-gray-600">Tell us about your barbershop</p>
        </div>
      </div>
      
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input 
            label="Business Name" 
            value={form.business_name} 
            onChange={v => setForm({ ...form, business_name: v })}
            icon={Building}
            required
          />
          <Input 
            label="Owner Name" 
            value={form.owner_name} 
            onChange={v => setForm({ ...form, owner_name: v })}
            icon={User}
            required
          />
          <Input 
            label="Phone Number" 
            value={form.phone} 
            onChange={v => setForm({ ...form, phone: v })}
            icon={Phone}
            type="tel"
            required
          />
          <Input 
            label="ZIP Code" 
            value={form.zip_code} 
            onChange={v => setForm({ ...form, zip_code: v })}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input 
            label="City" 
            value={form.city} 
            onChange={v => setForm({ ...form, city: v })}
            icon={MapPin}
            required
          />
          <Input 
            label="State" 
            value={form.state} 
            onChange={v => setForm({ ...form, state: v })}
            icon={MapPin}
            required
          />
        </div>
        
        <Input 
          label="Business Description" 
          value={form.bio} 
          onChange={v => setForm({ ...form, bio: v })}
          type="textarea"
          rows={4}
          placeholder="Tell customers about your experience and specialties..."
        />
      </div>
      
      <div className="mt-8 flex justify-end">
        <button 
          onClick={save} 
          disabled={saving || !isValid} 
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <Loader className="h-4 w-4 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4" />
              <span>Continue</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

/* ---------- HOURS STEP ---------- */
function StepHours({ profileId, onSaved }: { profileId: string, onSaved: () => void }) {
  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const [availability, setAvailability] = useState<Record<number,{isOpen:boolean;startTime:string;endTime:string}>>({
    0:{isOpen:false,startTime:'09:00',endTime:'17:00'},
    1:{isOpen:true,startTime:'09:00',endTime:'17:00'},
    2:{isOpen:true,startTime:'09:00',endTime:'17:00'},
    3:{isOpen:true,startTime:'09:00',endTime:'17:00'},
    4:{isOpen:true,startTime:'09:00',endTime:'17:00'},
    5:{isOpen:true,startTime:'09:00',endTime:'18:00'},
    6:{isOpen:true,startTime:'08:00',endTime:'16:00'},
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await supabase.from('availability').delete().eq('barber_id', profileId);
      const rows = Object.entries(availability)
        .filter(([_,d]) => d.isOpen)
        .map(([day,d]) => ({
          barber_id: profileId, 
          day_of_week: Number(day),
          start_time: d.startTime, 
          end_time: d.endTime, 
          is_available: true
        }));
      if (rows.length) await supabase.from('availability').insert(rows);
      onSaved();
    } catch (error) {
      console.error('Error saving hours:', error);
    } finally {
      setSaving(false);
    }
  }

  const hasOpenDays = Object.values(availability).some(d => d.isOpen);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
      <div className="flex items-center space-x-3 mb-6">
        <div className="bg-yellow-100 p-3 rounded-2xl">
          <Clock className="h-6 w-6 text-yellow-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Business Hours</h2>
          <p className="text-gray-600">When are you available for appointments?</p>
        </div>
      </div>
      
      <div className="space-y-4">
        {dayNames.map((name, i) => (
          <div key={i} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl">
            <div className="flex items-center space-x-4">
              <div className="w-24 font-medium text-gray-900">{name}</div>
              <label className="inline-flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  checked={availability[i]?.isOpen||false}
                  onChange={e => setAvailability(v => ({...v, [i]: {...v[i], isOpen: e.target.checked}}))}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="text-gray-700">Open</span>
              </label>
            </div>
            {availability[i]?.isOpen && (
              <div className="flex items-center space-x-2">
                <input 
                  type="time" 
                  value={availability[i].startTime}
                  onChange={e => setAvailability(v => ({...v, [i]: {...v[i], startTime: e.target.value}}))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <span className="text-gray-500">to</span>
                <input 
                  type="time" 
                  value={availability[i].endTime}
                  onChange={e => setAvailability(v => ({...v, [i]: {...v[i], endTime: e.target.value}}))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            )}
          </div>
        ))}
      </div>
      
      <div className="mt-8 flex justify-end">
        <button 
          onClick={save} 
          disabled={saving || !hasOpenDays} 
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <Loader className="h-4 w-4 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4" />
              <span>Continue</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

/* ---------- SERVICES STEP ---------- */
function StepServices({ profileId, onSaved }: { profileId: string, onSaved: () => void }) {
  const [name, setName] = useState('Haircut');
  const [duration, setDuration] = useState(45);
  const [price, setPrice] = useState(35);
  const [description, setDescription] = useState('Classic men\'s haircut');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const { error } = await supabase.from('services').insert({
        barber_id: profileId,
        name,
        description,
        duration_minutes: duration,
        price,
        is_active: true
      });
      
      if (error) throw error;
      onSaved();
    } catch (error) {
      console.error('Error saving service:', error);
    } finally {
      setSaving(false);
    }
  }

  const isValid = name.trim() && price > 0 && duration > 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
      <div className="flex items-center space-x-3 mb-6">
        <div className="bg-emerald-100 p-3 rounded-2xl">
          <Scissors className="h-6 w-6 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Add Your First Service</h2>
          <p className="text-gray-600">Define a service customers can book</p>
        </div>
      </div>
      
      <div className="space-y-6">
        <Input 
          label="Service Name" 
          value={name} 
          onChange={setName}
          icon={Scissors}
          placeholder="e.g., Haircut, Beard Trim"
          required
        />
        
        <Input 
          label="Description" 
          value={description} 
          onChange={setDescription}
          type="textarea"
          rows={3}
          placeholder="Describe this service for customers..."
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input 
            type="number" 
            label="Duration (minutes)" 
            value={String(duration)} 
            onChange={v => setDuration(Number(v)||0)}
            icon={Clock}
            required
          />
          <Input 
            type="number" 
            label="Price ($)" 
            value={String(price)} 
            onChange={v => setPrice(Number(v)||0)}
            icon={DollarSign}
            required
          />
        </div>
      </div>
      
      <div className="mt-8 flex justify-between">
        <button 
          onClick={onSaved} 
          className="btn-secondary"
        >
          Skip for Now
        </button>
        <button 
          onClick={save} 
          disabled={saving || !isValid} 
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <Loader className="h-4 w-4 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4" />
              <span>Continue</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

/* ---------- PAYOUTS (STRIPE) STEP ---------- */
function StepPayouts() {
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  
  async function startStripe() {
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-onboard', { body: {} });
      if (error) throw error;
      const url = (data as any)?.url;
      if (!url) throw new Error('Missing onboarding link');
      window.location.href = url;
    } catch (error) {
      console.error('Error starting Stripe onboarding:', error);
    } finally {
      setCreating(false);
    }
  }
  
  function skipToCompleted() {
    navigate('/dashboard/barber/profile');
  }
  
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
      <div className="flex items-center space-x-3 mb-6">
        <div className="bg-blue-100 p-3 rounded-2xl">
          <CreditCard className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Connect Payouts</h2>
          <p className="text-gray-600">Start accepting payments from customers</p>
        </div>
      </div>
      
      <div className="bg-gray-50 rounded-xl p-6 mb-6">
        <h3 className="font-semibold text-gray-900 mb-3">What you get:</h3>
        <ul className="space-y-2 text-gray-700">
          <li className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            <span>Accept online payments instantly</span>
          </li>
          <li className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            <span>Money deposited directly to your bank</span>
          </li>
          <li className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            <span>1% platform fee + Stripe processing</span>
          </li>
          <li className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            <span>No monthly fees or subscriptions</span>
          </li>
        </ul>
      </div>
      
      <p className="text-gray-600 mb-6 leading-relaxed">
        You'll be redirected to Stripe to securely connect your bank account. 
        This usually takes about 2 minutes to complete.
      </p>
      
      <div className="flex justify-between">
        <button 
          onClick={skipToCompleted}
          className="btn-secondary"
        >
          Skip for Now
        </button>
        <button 
          onClick={startStripe} 
          disabled={creating} 
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {creating ? (
            <>
              <Loader className="h-4 w-4 animate-spin" />
              <span>Redirecting...</span>
            </>
          ) : (
            <>
              <CreditCard className="h-4 w-4" />
              <span>Connect with Stripe</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

/* ---------- REUSABLE INPUT ---------- */
function Input({ 
  label, 
  value, 
  onChange, 
  type = 'text',
  icon: Icon,
  required = false,
  placeholder,
  rows
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  icon?: React.ElementType;
  required?: boolean;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        {Icon && (
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
            <Icon className="h-5 w-5 text-gray-400" />
          </div>
        )}
        {type === 'textarea' ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={rows || 3}
            className={`w-full px-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400 ${Icon ? 'pl-12' : ''}`}
            placeholder={placeholder}
          />
        ) : (
          <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`w-full px-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400 ${Icon ? 'pl-12' : ''}`}
            placeholder={placeholder}
          />
        )}
      </div>
    </div>
  );
}