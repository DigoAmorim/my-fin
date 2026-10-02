import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Calendar } from './calendar';
import { cn } from '../../lib/utils';
import { resolveDateLocales } from '../../lib/date-locales';

type DatePickerInputProps = {
	id?: string;
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	className?: string;
	disabled?: boolean;
	align?: 'start' | 'center' | 'end';
};

export function DatePickerInput({
	id,
	value,
	onChange,
	placeholder,
	className,
	disabled,
	align = 'start',
}: DatePickerInputProps) {
	const { i18n } = useTranslation();
	const [open, setOpen] = useState(false);
	const [today] = useState(() => new Date());
	const language = i18n.resolvedLanguage ?? i18n.language;
	const { dateFnsLocale, intlLocale } = resolveDateLocales(language);
	const selectedDate = value ? new Date(`${value}T00:00:00`) : undefined;
	const displayText = selectedDate
		? selectedDate.toLocaleDateString(intlLocale)
		: placeholder || (intlLocale === 'en-US' ? 'MM/dd/yyyy' : 'dd/mm/yyyy');

	return (
		<Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
			<PopoverTrigger asChild>
				<button
					id={id}
					type="button"
					disabled={disabled}
					aria-haspopup="dialog"
					className={cn(
						'inline-flex min-w-[120px] cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted/50 disabled:pointer-events-none disabled:opacity-50',
						!value && 'text-muted-foreground',
						className,
					)}
				>
					  <CalendarIcon className="size-3.5 shrink-0 text-muted-foreground" />
					{displayText}
				</button>
			</PopoverTrigger>
			<PopoverContent align={align} className="w-auto p-0">
				<Calendar
					selected={selectedDate}
					  defaultMonth={selectedDate ?? today}
					locale={dateFnsLocale}
					onSelect={(date) => {
						if (!date) return;
						onChange(format(date, 'yyyy-MM-dd'));
						setOpen(false);
					}}
				/>
			</PopoverContent>
		</Popover>
	);
}
