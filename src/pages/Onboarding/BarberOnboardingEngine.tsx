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
          await supabase
            .from('barber_profiles')
            .upsert(
              {
                user_id: user.id,
                business_name: user.user_metadata?.business_name || `${user.user_metadata?.first_name || 'New'} Barber Shop`,
                owner_name: `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() || 'Barber',
                email: user.email || '',
                is_claimed: true,
                is_active: false,
                slug: `barber-${user.id.slice(0, 8)}`
              },
              { onConflict: 'user_id' }
            );
        }

        const { data: prof2 } = await supabase
          .from('barber_profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        setProfile(prof2);

        // 2) Progress checks (infer from existing tables)
        const { count: availabilityCount } = await supabase
          .from('availability')
          .select('id', { count: 'exact', head: true })
          .eq('barber_id', prof2?.id)
          .eq('is_available', true);

        setHasHours((availabilityCount || 0) > 0);

        const { count: servicesCount } = await supabase
          .from('services')
          .select('id', { count: 'exact', head: true })
          .eq('barber_id', prof2?.id)
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center page-container relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary-500/5 rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent-500/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }}></div>
        </div>
        
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-100 border-t-primary-500 mx-auto"></div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary-500 to-accent-500 opacity-20 blur-lg"></div>
          </div>
          <div className="space-y-2">
            <p className="text-xl text-gray-700 font-semibold">Setting up your barber account...</p>
            <p className="text-gray-500 font-medium">Preparing your professional onboarding experience</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 page-container relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary-500/5 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent-500/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }}></div>
      </div>
      
      <div className="relative z-10 max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <img 
              src="/Kutable Logo.png" 
              alt="Kutable Logo" 
              className="h-14 w-auto"
            />
            <span className="text-3xl font-display font-bold text-gray-900">Kutable</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-gray-900 mb-4">Complete Your Setup</h1>
          <p className="text-xl text-gray-600 font-medium max-w-2xl mx-auto">Let's get your professional barber profile ready for customers</p>
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
  const stepLabels = ['Account Setup', 'Business Hours', 'Service Menu', 'Payment Setup'];
  const stepDescriptions = [
    'Business information and contact details',
    'Set your availability and working hours', 
    'Define services and pricing',
    'Connect payments with Stripe'
  ];
  
  return (
    <div className="mb-12">
      <div className="card-premium p-8 max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-2 bg-primary-50 text-primary-700 rounded-full px-6 py-3 mb-4">
            <span className="font-semibold">Step {idx + 1} of {STEPS.length}</span>
          </div>
          <h2 className="text-2xl font-display font-bold text-gray-900 mb-2">{stepLabels[idx]}</h2>
          <p className="text-gray-600 font-medium">{stepDescriptions[idx]}</p>
        </div>
        
        <div className="flex items-center justify-between">
          {STEPS.map((s, i) => {
            const Icon = stepIcons[i];
            const isActive = i === idx;
            const isCompleted = i < idx;
            
            return (
              <div key={s} className="flex items-center">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-premium ${
                  isActive 
                    ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-premium-lg transform scale-110' 
                    : isCompleted 
                    ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg' 
                    : 'bg-white border-2 border-gray-200 text-gray-400'
                }`}>
                  {isCompleted ? (
                    <CheckCircle className="h-7 w-7" />
                  ) : (
                    <Icon className="h-7 w-7" />
                  )}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`w-20 h-2 mx-4 rounded-full transition-all duration-300 ${
                    i < idx ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-md' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
        
        <div className="flex justify-between text-sm text-gray-600 font-semibold mt-6">
          {stepLabels.map((label, i) => (
            <span key={i} className={`${i === idx ? 'text-primary-600' : i < idx ? 'text-emerald-600' : 'text-gray-400'} transition-colors duration-300`}>
              {label}
            </span>
          ))}
        </div>
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
      await supabase
        .from('barber_profiles')
        .update({
          ...form,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id);

      onSaved();
    } catch (error) {
      console.error('Error saving account info:', error);
    } finally {
      setSaving(false);
    }
  }

  const isValid = form.business_name && form.owner_name && form.phone && form.city && form.state;

  return (
    <div className="card-premium p-10 max-w-4xl mx-auto animate-fade-in-up">
      <div className="text-center mb-10">
        <div className="bg-gradient-to-br from-primary-500 to-primary-600 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-premium animate-float">
          <Building className="h-10 w-10 text-white" />
        </div>
        <h2 className="text-3xl font-display font-bold text-gray-900 mb-4">Business Information</h2>
        <p className="text-lg text-gray-600 font-medium max-w-lg mx-auto">Tell us about your barbershop to create your professional profile</p>
      </div>
      
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Input 
            label="Business Name" 
            value={form.business_name} 
            onChange={v => setForm({ ...form, business_name: v })}
            icon={Building}
            required
            placeholder="e.g., Elite Cuts Barbershop"
          />
          <Input 
            label="Owner Name" 
            value={form.owner_name} 
            onChange={v => setForm({ ...form, owner_name: v })}
            icon={User}
            required
            placeholder="Your full name"
          />
          <Input 
            label="Phone Number" 
            value={form.phone} 
            onChange={v => setForm({ ...form, phone: v })}
            icon={Phone}
            type="tel"
            required
            placeholder="(555) 123-4567"
          />
          <Input 
            label="ZIP Code" 
            value={form.zip_code} 
            onChange={v => setForm({ ...form, zip_code: v })}
            icon={MapPin}
            placeholder="12345"
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Input 
            label="City" 
            value={form.city} 
            onChange={v => setForm({ ...form, city: v })}
            icon={MapPin}
            required
            placeholder="Your city"
          />
          <Input 
            label="State" 
            value={form.state} 
            onChange={v => setForm({ ...form, state: v })}
            icon={MapPin}
            required
            placeholder="Your state"
          />
        </div>
        
        <Input 
          label="Business Description" 
          value={form.bio} 
          onChange={v => setForm({ ...form, bio: v })}
          type="textarea"
          rows={5}
          placeholder="Tell customers about your experience and specialties..."
        />
      </div>
      
      <div className="mt-12 flex justify-center">
        <button 
          onClick={save} 
          disabled={saving || !isValid} 
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed px-12 py-4 text-lg hover:scale-105 transition-all duration-200"
        >
          {saving ? (
            <>
              <Loader className="h-4 w-4 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <CheckCircle className="h-5 w-5" />
              <span>Continue to Hours</span>
            </>
          )}
        </button>
      </div>
      
      {!isValid && (
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500 font-medium">
            Please fill in all required fields to continue
          </p>
        </div>
      )}
    </div>
  );
}

/* ---------- HOURS STEP ---------- */
function StepHours({ profileId, onSaved }: { profileId: string, onSaved: () => void }) {
  const { user } = useAuth();
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
    <div className="card-premium p-10 max-w-4xl mx-auto animate-fade-in-up">
      <div className="text-center mb-10">
        <div className="bg-gradient-to-br from-accent-500 to-accent-600 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-premium animate-float">
          <Clock className="h-10 w-10 text-white" />
        </div>
        <h2 className="text-3xl font-display font-bold text-gray-900 mb-4">Business Hours</h2>
        <p className="text-lg text-gray-600 font-medium max-w-lg mx-auto">Set your availability so customers know when they can book appointments</p>
      </div>
      
      <div className="space-y-6">
        {dayNames.map((name, i) => (
          <div key={i} className="bg-gray-50 border border-gray-200 rounded-2xl p-6 hover:shadow-md transition-all duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-6">
                <div className="w-28 text-lg font-display font-bold text-gray-900">{name}</div>
                <label className="inline-flex items-center space-x-3">
                  <input 
                    type="checkbox" 
                    checked={availability[i]?.isOpen||false}
                    onChange={e => setAvailability(v => ({...v, [i]: {...v[i], isOpen: e.target.checked}}))}
                    className="w-5 h-5 text-primary-600 border-gray-300 rounded-lg focus:ring-primary-500 transition-all duration-200"
                  />
                  <span className="text-gray-700 font-semibold">Open</span>
                </label>
              </div>
              {availability[i]?.isOpen && (
                <div className="flex items-center space-x-4">
                  <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">Hours:</div>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="time" 
                      value={availability[i].startTime}
                      onChange={e => setAvailability(v => ({...v, [i]: {...v[i], startTime: e.target.value}}))}
                      className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white transition-all duration-200 font-medium"
                    />
                    <span className="text-gray-500 font-semibold">to</span>
                    <input 
                      type="time" 
                      value={availability[i].endTime}
                      onChange={e => setAvailability(v => ({...v, [i]: {...v[i], endTime: e.target.value}}))}
                      className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white transition-all duration-200 font-medium"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-12 flex justify-center">
        <button 
          onClick={save} 
          disabled={saving || !hasOpenDays} 
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed px-12 py-4 text-lg hover:scale-105 transition-all duration-200"
        >
          {saving ? (
            <>
              <Loader className="h-5 w-5 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <CheckCircle className="h-5 w-5" />
              <span>Continue to Services</span>
            </>
          )}
        </button>
      </div>
      
      {!hasOpenDays && (
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500 font-medium">
            Please select at least one day when you're open for business
          </p>
        </div>
      )}
    </div>
  );
}

/* ---------- SERVICES STEP ---------- */
function StepServices({ profileId, onSaved }: { profileId: string, onSaved: () => void }) {
  const { user } = useAuth();
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
    <div className="card-premium p-10 max-w-4xl mx-auto animate-fade-in-up">
      <div className="text-center mb-10">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-premium animate-float">
          <Scissors className="h-10 w-10 text-white" />
        </div>
        <h2 className="text-3xl font-display font-bold text-gray-900 mb-4">Add Your First Service</h2>
        <p className="text-lg text-gray-600 font-medium max-w-lg mx-auto">Define a service that customers can discover and book online</p>
      </div>
      
      <div className="space-y-8">
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
          rows={4}
          placeholder="Describe this service for customers..."
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Input 
            type="number" 
            label="Duration (minutes)" 
            value={String(duration)} 
            onChange={v => setDuration(Number(v)||0)}
            icon={Clock}
            required
            placeholder="30"
          />
          <Input 
            type="number" 
            label="Price ($)" 
            value={String(price)} 
            onChange={v => setPrice(Number(v)||0)}
            icon={DollarSign}
            required
            placeholder="35.00"
          />
        </div>
      </div>
      
      <div className="mt-12 flex flex-col sm:flex-row justify-center gap-4">
        <button 
          onClick={onSaved} 
          className="btn-secondary px-8 py-3 text-lg hover:scale-105 transition-all duration-200"
        >
          Skip for Now
        </button>
        <button 
          onClick={save} 
          disabled={saving || !isValid} 
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed px-12 py-4 text-lg hover:scale-105 transition-all duration-200"
        >
          {saving ? (
            <>
              <Loader className="h-5 w-5 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <CheckCircle className="h-5 w-5" />
              <span>Continue to Payments</span>
            </>
          )}
        </button>
      </div>
      
      {!isValid && (
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500 font-medium">
            Please provide a service name, valid price, and duration
          </p>
        </div>
      )}
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
    <div className="card-premium p-10 max-w-4xl mx-auto animate-fade-in-up">
      <div className="text-center mb-10">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-premium animate-float">
          <CreditCard className="h-10 w-10 text-white" />
        </div>
        <h2 className="text-3xl font-display font-bold text-gray-900 mb-4">Connect Payouts</h2>
        <p className="text-lg text-gray-600 font-medium max-w-lg mx-auto">Start accepting secure payments from customers instantly</p>
      </div>
      
      <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-2xl p-8 mb-8">
        <h3 className="text-xl font-display font-bold text-emerald-900 mb-6 text-center">What you get with Stripe Connect:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-start space-x-3">
            <div className="bg-emerald-500 p-2 rounded-xl">
              <CheckCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-emerald-800">Instant Payments</p>
              <p className="text-emerald-700 text-sm">Accept online payments from customers instantly</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="bg-emerald-500 p-2 rounded-xl">
              <CheckCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-emerald-800">Direct Deposits</p>
              <p className="text-emerald-700 text-sm">Money deposited directly to your bank account</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="bg-emerald-500 p-2 rounded-xl">
              <CheckCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-emerald-800">Low Fees</p>
              <p className="text-emerald-700 text-sm">1% platform fee + standard Stripe processing</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="bg-emerald-500 p-2 rounded-xl">
              <CheckCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-emerald-800">No Subscriptions</p>
              <p className="text-emerald-700 text-sm">No monthly fees or long-term contracts</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-6 mb-8">
        <div className="flex items-start space-x-4">
          <div className="bg-blue-500 p-2 rounded-xl">
            <CreditCard className="h-5 w-5 text-white" />
          </div>
          <div>
            <h4 className="font-semibold text-blue-800 mb-2">About the Setup Process</h4>
            <p className="text-blue-700 leading-relaxed font-medium">
              Stripe will securely collect your business information and bank details. This typically takes 2-3 minutes and you'll be able to accept payments immediately after completion.
            </p>
          </div>
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row justify-center gap-4">
        <button 
          onClick={skipToCompleted}
          className="btn-secondary px-8 py-3 text-lg hover:scale-105 transition-all duration-200"
        >
          Skip for Now
        </button>
        <button 
          onClick={startStripe} 
          disabled={creating} 
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed px-12 py-4 text-lg hover:scale-105 transition-all duration-200"
        >
          {creating ? (
            <>
              <Loader className="h-5 w-5 animate-spin" />
              <span>Redirecting...</span>
            </>
          ) : (
            <>
              <CreditCard className="h-5 w-5" />
              <span>Connect Payments</span>
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
    <div className="space-y-3">
      <label className="block text-sm font-semibold text-gray-700 mb-3">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        {Icon && (
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 flex items-center justify-center w-5 h-5">
            <Icon className="h-5 w-5 text-gray-400" />
          </div>
        )}
        {type === 'textarea' ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={rows || 3}
            className={`w-full px-6 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400 text-base font-medium ${Icon ? 'pl-12' : ''}`}
            placeholder={placeholder}
          />
        ) : (
          <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`w-full px-6 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400 text-base font-medium ${Icon ? 'pl-12' : ''}`}
            placeholder={placeholder}
          />
        )}
      </div>
    </div>
  );
}