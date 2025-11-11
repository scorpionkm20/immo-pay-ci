import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarIcon, Clock, Video, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AppointmentCalendarProps {
  propertyId: string;
  gestionnaireId: string;
  onCreateAppointment: (
    propertyId: string,
    gestionnaireId: string,
    date: Date,
    type: 'virtuelle' | 'presentiel',
    notes?: string
  ) => Promise<void>;
  onCancel: () => void;
}

export const AppointmentCalendar = ({ 
  propertyId, 
  gestionnaireId, 
  onCreateAppointment, 
  onCancel 
}: AppointmentCalendarProps) => {
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState<string>('10:00');
  const [typeVisite, setTypeVisite] = useState<'virtuelle' | 'presentiel'>('virtuelle');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) return;

    const [hours, minutes] = time.split(':').map(Number);
    const appointmentDate = new Date(date);
    appointmentDate.setHours(hours, minutes, 0, 0);

    setLoading(true);
    await onCreateAppointment(propertyId, gestionnaireId, appointmentDate, typeVisite, notes);
    setLoading(false);
  };

  // Generate time slots (8h to 18h, every 30 minutes)
  const timeSlots = [];
  for (let hour = 8; hour <= 18; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      if (hour === 18 && minute > 0) break;
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      timeSlots.push(timeString);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5" />
          Programmer une visite
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label>Type de visite</Label>
            <Select value={typeVisite} onValueChange={(val: 'virtuelle' | 'presentiel') => setTypeVisite(val)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="virtuelle">
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4" />
                    <span>Visite virtuelle (en ligne)</span>
                  </div>
                </SelectItem>
                <SelectItem value="presentiel">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>Visite présentielle (sur place)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Choisir une date</Label>
            <div className="mt-2 flex justify-center">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                disabled={(date) => date < new Date() || date < new Date(new Date().setHours(0, 0, 0, 0))}
                locale={fr}
                className="rounded-md border"
              />
            </div>
          </div>

          {date && (
            <div>
              <Label htmlFor="time">Choisir une heure</Label>
              <Select value={time} onValueChange={setTime}>
                <SelectTrigger id="time">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {timeSlots.map((slot) => (
                    <SelectItem key={slot} value={slot}>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {slot}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {date && (
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm font-medium">Rendez-vous prévu le :</p>
              <p className="text-lg">
                {format(date, 'EEEE d MMMM yyyy', { locale: fr })} à {time}
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="notes">Notes (optionnelles)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Questions ou demandes particulières..."
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
              Annuler
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !date} 
              className="flex-1"
            >
              {loading ? 'Envoi en cours...' : 'Demander ce rendez-vous'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
