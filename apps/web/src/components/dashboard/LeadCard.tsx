import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Building2, Mail, Phone, Calendar as CalendarIcon, User, CalendarPlus, FileText, ChevronDown, CheckCircle, CalendarClock } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type ClientStatus = 'lead_captured' | 'meeting_scheduled' | 'contract_sent' | 'second_meeting' | 'active_client' | 'inactive';

interface Customer {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone_number: string | null;
  business_name: string | null;
  client_status: ClientStatus | null;
  created_at: string | null;
}

interface LeadCardProps {
  customer: Customer;
  status: ClientStatus;
  meetingDate?: string | null;
  onScheduleMeeting: (customerId: string, date: Date, title: string) => void;
  onRescheduleMeeting: (customerId: string, date: Date) => void;
  onUpdateStatus: (customerId: string, status: ClientStatus) => void;
  isUpdating?: boolean;
}

export function LeadCard({ customer, status, meetingDate, onScheduleMeeting, onRescheduleMeeting, onUpdateStatus, isUpdating }: LeadCardProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [secondMeetingCalendarOpen, setSecondMeetingCalendarOpen] = useState(false);
  const [rescheduleCalendarOpen, setRescheduleCalendarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

  const handleScheduleMeeting = (date: Date | undefined) => {
    if (!date) return;
    
    const title = status === 'lead_captured' 
      ? `Discovery Call - ${customer.first_name} ${customer.last_name}`
      : `Follow-up Meeting - ${customer.first_name} ${customer.last_name}`;
    
    onScheduleMeeting(customer.id, date, title);
    setCalendarOpen(false);
    setSecondMeetingCalendarOpen(false);
    setSelectedDate(undefined);
  };

  const handleSendContract = () => {
    onUpdateStatus(customer.id, 'contract_sent');
  };

  const handleContractSigned = () => {
    onUpdateStatus(customer.id, 'active_client');
  };

  const renderStatusActions = () => {
    switch (status) {
      case 'lead_captured':
        return (
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-1" disabled={isUpdating}>
                <CalendarPlus className="h-3 w-3" />
                Schedule Meeting
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  setSelectedDate(date);
                  handleScheduleMeeting(date);
                }}
                disabled={(date) => date < new Date()}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        );

      case 'meeting_scheduled':
        return (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-1" disabled={isUpdating}>
                  Next Step
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48 bg-popover z-50">
                <DropdownMenuItem 
                  onSelect={(e) => {
                    e.preventDefault();
                    setRescheduleCalendarOpen(true);
                  }}
                  className="gap-2 cursor-pointer"
                >
                  <CalendarClock className="h-4 w-4" />
                  Reschedule Meeting
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSendContract} className="gap-2 cursor-pointer">
                  <FileText className="h-4 w-4" />
                  Send Contract
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onSelect={(e) => {
                    e.preventDefault();
                    setSecondMeetingCalendarOpen(true);
                  }}
                  className="gap-2 cursor-pointer"
                >
                  <CalendarPlus className="h-4 w-4" />
                  Schedule 2nd Meeting
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Reschedule Calendar Dialog */}
            <Dialog open={rescheduleCalendarOpen} onOpenChange={setRescheduleCalendarOpen}>
              <DialogContent className="sm:max-w-[350px] p-0">
                <DialogHeader className="p-4 pb-0">
                  <DialogTitle>Reschedule Meeting</DialogTitle>
                </DialogHeader>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    if (date) {
                      setSelectedDate(date);
                      onRescheduleMeeting(customer.id, date);
                      setRescheduleCalendarOpen(false);
                      setSelectedDate(undefined);
                    }
                  }}
                  disabled={(date) => date < new Date()}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </DialogContent>
            </Dialog>

            {/* Second Meeting Calendar Dialog */}
            <Dialog open={secondMeetingCalendarOpen} onOpenChange={setSecondMeetingCalendarOpen}>
              <DialogContent className="sm:max-w-[350px] p-0">
                <DialogHeader className="p-4 pb-0">
                  <DialogTitle>Schedule 2nd Meeting</DialogTitle>
                </DialogHeader>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    if (date) {
                      setSelectedDate(date);
                      onScheduleMeeting(customer.id, date, `Follow-up Meeting - ${customer.first_name} ${customer.last_name}`);
                      onUpdateStatus(customer.id, 'second_meeting');
                      setSecondMeetingCalendarOpen(false);
                      setSelectedDate(undefined);
                    }
                  }}
                  disabled={(date) => date < new Date()}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </DialogContent>
            </Dialog>
          </>
        );

      case 'second_meeting':
        return (
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full h-8 text-xs gap-1" 
            onClick={handleSendContract}
            disabled={isUpdating}
          >
            <FileText className="h-3 w-3" />
            Send Contract
          </Button>
        );

      case 'contract_sent':
        return (
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full h-8 text-xs gap-1 text-green-700 border-green-300 hover:bg-green-50 hover:text-green-800" 
            onClick={handleContractSigned}
            disabled={isUpdating}
          >
            <CheckCircle className="h-3 w-3" />
            Contract Signed
          </Button>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <User className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="font-medium text-sm truncate">
              {customer.first_name} {customer.last_name}
            </span>
          </div>
        </div>
        
        {customer.business_name && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Building2 className="h-3 w-3 shrink-0" />
            <span className="truncate">{customer.business_name}</span>
          </div>
        )}
        
        {customer.email && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Mail className="h-3 w-3 shrink-0" />
            <span className="truncate">{customer.email}</span>
          </div>
        )}
        
        {customer.phone_number && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Phone className="h-3 w-3 shrink-0" />
            <span>{customer.phone_number}</span>
          </div>
        )}

        {meetingDate ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarIcon className="h-3 w-3 shrink-0" />
            <span>Meeting: {format(new Date(meetingDate), "MMM d, yyyy")}</span>
          </div>
        ) : customer.created_at && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarIcon className="h-3 w-3 shrink-0" />
            <span>Added: {format(new Date(customer.created_at), "MMM d, yyyy")}</span>
          </div>
        )}

        <div className="pt-2">
          {renderStatusActions()}
        </div>
      </CardContent>
    </Card>
  );
}
